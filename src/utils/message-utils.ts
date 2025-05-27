import type { Message, TextChannel, Attachment, Embed, Sticker, Poll } from 'discord.js';
import type { AIMessage, ToolCall, ToolResult, MessageContentPart, TextContentPart, ImageContentPart, AudioContentPart } from '../services/ai/types';
import { getAnchorMessageId, clearAnchorMessageId } from './anchorMessageUtils';
import { DiscordAPIError } from 'discord.js';
import { ToolCallsStore } from '../services/ai/tool-calls-store';
import type OpenAI from 'openai';

// Image cache for base64 conversions
const imageCache = new Map<string, string>();

/**
 * Convert image URL to base64 with caching
 */
async function convertImageToBase64(url: string): Promise<string> {
  // Check cache first
  if (imageCache.has(url)) {
    console.log(`[ImageCache] Cache hit for ${url.substring(0, 50)}...`);
    const cached = imageCache.get(url);
    if (cached) return cached;
  }

  try {
    console.log(`[ImageCache] Downloading and converting ${url.substring(0, 50)}...`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    // Determine MIME type from URL or default to PNG
    let mimeType = 'image/png';
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (urlLower.includes('.gif')) {
      mimeType = 'image/gif';
    } else if (urlLower.includes('.webp')) {
      mimeType = 'image/webp';
    }
    
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    // Cache the result (limit cache size to prevent memory issues)
    if (imageCache.size >= 100) {
      const firstKey = imageCache.keys().next().value;
      if (firstKey) {
        imageCache.delete(firstKey);
      }
    }
    imageCache.set(url, dataUrl);
    
    console.log(`[ImageCache] Cached image: ${mimeType}, size: ${Math.round(base64.length / 1024)}KB`);
    return dataUrl;
  } catch (error) {
    console.error(`[ImageCache] Error converting image to base64:`, error);
    // Fall back to URL if base64 conversion fails
    return url;
  }
}

/**
 * Fetch recent messages from a channel
 */
export async function fetchRecentMessages(channel: TextChannel, limit: number): Promise<Message[]> {
  try {
    // Try to get anchor message ID (optional feature)
    const anchorId = await getAnchorMessageId(channel.id);
    
    let messages;
    if (anchorId) {
      try {
        messages = await channel.messages.fetch({ limit, after: anchorId });
      } catch (error) {
        // If anchor message is not found, clear it and fetch normally
        if (error instanceof DiscordAPIError && error.code === 10008) {
          await clearAnchorMessageId(channel.id);
          messages = await channel.messages.fetch({ limit });
        } else {
          throw error;
        }
      }
    } else {
      messages = await channel.messages.fetch({ limit });
    }
    
    return Array.from(messages.values()).reverse();
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

/**
 * Convert Discord attachment to native OpenAI content part or text description
 */
async function convertAttachmentToContentPart(attachment: Attachment): Promise<MessageContentPart> {
  const { name, size, contentType, description, url } = attachment;
  
  if (contentType) {
    // Handle images natively with base64 conversion
    if (contentType.startsWith('image/')) {
      try {
        const base64Url = await convertImageToBase64(url);
        return {
          type: 'image_url',
          image_url: {
            url: base64Url,
            detail: 'auto'
          }
        };
      } catch (error) {
        console.error('Error converting image to base64, falling back to URL:', error);
        return {
          type: 'image_url',
          image_url: {
            url: url,
            detail: 'auto'
          }
        };
      }
    }
    
    // Handle audio natively (if supported format)
    if (contentType.startsWith('audio/')) {
      // Note: For native audio support, we'd need to convert to base64
      // For now, we'll create a text description since Discord URLs are not base64
      const sizeInMB = (size / (1024 * 1024)).toFixed(2);
      return {
        type: 'text',
        text: `[Audio File: ${name} (${sizeInMB}MB) - ${contentType} - URL: ${url}]`
      };
    }
  }
  
  // For other file types, create descriptive text
  const sizeInMB = (size / (1024 * 1024)).toFixed(2);
  let attachmentText = `[Attachment: ${name} (${sizeInMB}MB)`;
  
  if (contentType) {
    if (contentType.startsWith('video/')) {
      attachmentText += ` - Video`;
      if (attachment.height && attachment.width) {
        attachmentText += ` (${attachment.width}x${attachment.height})`;
      }
    } else if (contentType.includes('pdf')) {
      attachmentText += ` - PDF Document`;
    } else if (contentType.includes('text/')) {
      attachmentText += ` - Text File`;
    } else {
      attachmentText += ` - File (${contentType})`;
    }
  }
  
  if (description) {
    attachmentText += ` - Description: "${description}"`;
  }
  
  attachmentText += ` - URL: ${url}]`;
  
  return {
    type: 'text',
    text: attachmentText
  };
}

/**
 * Convert Discord embed to text description (embeds are Discord-specific, no native OpenAI equivalent)
 */
function convertEmbedToText(embed: Embed): string {
  let embedText = '[Embed:';
  
  if (embed.title) {
    embedText += ` Title: "${embed.title}"`;
  }
  
  if (embed.description) {
    embedText += ` Description: "${embed.description}"`;
  }
  
  if (embed.url) {
    embedText += ` URL: ${embed.url}`;
  }
  
  if (embed.author) {
    embedText += ` Author: "${embed.author.name}"`;
  }
  
  if (embed.fields && embed.fields.length > 0) {
    embedText += ' Fields: ';
    embed.fields.forEach((field, index) => {
      embedText += `"${field.name}: ${field.value}"`;
      if (index < embed.fields.length - 1) embedText += ', ';
    });
  }
  
  if (embed.footer) {
    embedText += ` Footer: "${embed.footer.text}"`;
  }
  
  if (embed.image) {
    embedText += ` Image: ${embed.image.url}`;
  }
  
  if (embed.thumbnail) {
    embedText += ` Thumbnail: ${embed.thumbnail.url}`;
  }
  
  if (embed.timestamp) {
    embedText += ` Timestamp: ${embed.timestamp}`;
  }
  
  embedText += ']';
  
  return embedText;
}

/**
 * Convert Discord sticker to text description
 */
function convertStickerToText(sticker: Sticker): string {
  return `[Sticker: "${sticker.name}" - ${sticker.description || 'No description'}]`;
}

/**
 * Convert Discord message reactions to text
 */
function convertReactionsToText(message: Message): string {
  if (!message.reactions.cache.size) return '';
  
  const reactions = Array.from(message.reactions.cache.values()).map(reaction => {
    const emoji = reaction.emoji.name || 'Unknown';
    return `${emoji} (${reaction.count})`;
  });
  
  return `[Reactions: ${reactions.join(', ')}]`;
}

/**
 * Convert Discord message reference (reply) to text
 */
function convertMessageReferenceToText(message: Message): string {
  if (!message.reference) return '';
  
  let referenceText = '[Reply to: ';
  
  if (message.reference.messageId) {
    // Try to get the referenced message from cache
    const referencedMessage = message.channel.messages.cache.get(message.reference.messageId);
    if (referencedMessage) {
      const authorName = referencedMessage.author.username;
      const content = referencedMessage.content || '[No text content]';
      const truncatedContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
      referenceText += `${authorName}: "${truncatedContent}"`;
    } else {
      referenceText += `Message ID ${message.reference.messageId}`;
    }
  }
  
  referenceText += ']';
  return referenceText;
}

/**
 * Convert Discord poll to text description
 */
function convertPollToText(poll: Poll): string {
  if (!poll) return '';
  
  let pollText = `[Poll: "${poll.question.text}"`;
  
  if (poll.answers && poll.answers.size > 0) {
    pollText += ' Options: ';
    const answersArray = Array.from(poll.answers.values());
    answersArray.forEach((answer, index) => {
      pollText += `"${answer.text}"`;
      if (index < answersArray.length - 1) pollText += ', ';
    });
  }
  
  if (poll.expiresAt) {
    pollText += ` Expires: ${poll.expiresAt}`;
  }
  
  pollText += ']';
  
  return pollText;
}

/**
 * Convert Discord messages to AI message format with native multimodal content
 */
export async function convertToAIMessages(messages: Message[], query: string): Promise<AIMessage[]> {
  const aiMessages: AIMessage[] = [];
  const toolCallsStore = ToolCallsStore.getInstance();
  
  for (const message of messages) {
    const isBot = message.author.bot;
    
    // Skip empty bot messages unless they have other content
    if (isBot && !message.content && !message.attachments.size && !message.embeds.length && !message.stickers.size) {
      continue;
    }
    
    // Build multimodal content for user messages
    if (!isBot) {
      const contentParts: MessageContentPart[] = [];
      
      // Add username as prefix text
      const username = message.member?.displayName || message.author.displayName || message.author.username;
      contentParts.push({
        type: 'text',
        text: `${username}:`
      });
      
      // Add message reference (reply) information as text
      const replyInfo = convertMessageReferenceToText(message);
      if (replyInfo) {
        contentParts.push({
          type: 'text',
          text: replyInfo
        });
      }
      
      // Add main text content
      if (message.content) {
        contentParts.push({
          type: 'text',
          text: message.content
        });
      }
      
      // Add attachments (using native image support, text descriptions for others)
      if (message.attachments.size > 0) {
        const attachmentParts = await Promise.all(
          Array.from(message.attachments.values()).map(convertAttachmentToContentPart)
        );
        contentParts.push(...attachmentParts);
      }
      
      // Add embeds as text (Discord-specific, no OpenAI equivalent)
      if (message.embeds.length > 0) {
        const embedTexts = message.embeds.map(convertEmbedToText);
        embedTexts.forEach(embedText => {
          contentParts.push({
            type: 'text',
            text: embedText
          });
        });
      }
      
      // Add stickers as text
      if (message.stickers.size > 0) {
        const stickerTexts = Array.from(message.stickers.values()).map(convertStickerToText);
        stickerTexts.forEach(stickerText => {
          contentParts.push({
            type: 'text',
            text: stickerText
          });
        });
      }
      
      // Add poll information as text
      if (message.poll) {
        const pollText = convertPollToText(message.poll);
        if (pollText) {
          contentParts.push({
            type: 'text',
            text: pollText
          });
        }
      }
      
      // Add reactions as text
      const reactionsText = convertReactionsToText(message);
      if (reactionsText) {
        contentParts.push({
          type: 'text',
          text: reactionsText
        });
      }
      
      // Add timestamp for context
      const timestamp = message.createdAt.toLocaleString();
      contentParts.push({
        type: 'text',
        text: `[Sent: ${timestamp}]`
      });
      
      // Create the AI message with multimodal content
      const cleanName = username
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 64); // OpenAI name field limit

      const userMessage: OpenAI.Chat.Completions.ChatCompletionUserMessageParam = {
        role: 'user',
        content: contentParts.length > 0 ? contentParts : 'No content',
        name: cleanName,
      };
      
      aiMessages.push(userMessage);
    } else {
      // For bot messages, handle as assistant messages
      const contentParts: MessageContentPart[] = [];
      
      if (message.content) {
        contentParts.push({
          type: 'text',
          text: message.content
        });
      }
      
      // Add bot attachments (simplified handling)
      if (message.attachments.size > 0) {
        const botAttachmentParts = await Promise.all(
          Array.from(message.attachments.values()).map(async (att) => {
            if (att.contentType?.startsWith('image/')) {
              // Native image support for bot images too
              try {
                const base64Url = await convertImageToBase64(att.url);
                return {
                  type: 'image_url' as const,
                  image_url: {
                    url: base64Url,
                    detail: 'auto' as const
                  }
                };
              } catch (error) {
                return {
                  type: 'text' as const,
                  text: `[Bot shared: ${att.name} (image conversion failed)]`
                };
              }
            } else {
              return {
                type: 'text' as const,
                text: `[Bot shared: ${att.name}${att.contentType?.startsWith('image/') ? ' (image)' : ''}]`
              };
            }
          })
        );
        contentParts.push(...botAttachmentParts);
      }
      
      // Add bot embeds (simplified)
      if (message.embeds.length > 0) {
        const embedTexts = message.embeds.map(embed => 
          `[Bot embed: ${embed.title || embed.description || 'Embedded content'}]`
        );
        embedTexts.forEach(embedText => {
          contentParts.push({
            type: 'text',
            text: embedText
          });
        });
      }
      
      // Convert to single string if only text, or keep as array for multimodal
      let content: string | null;
      if (contentParts.length === 0) {
        content = null;
      } else if (contentParts.length === 1 && contentParts[0] && contentParts[0].type === 'text') {
        content = (contentParts[0] as TextContentPart).text;
      } else {
        // For assistant messages, we need to convert multimodal content to text
        // since OpenAI SDK doesn't support multimodal content for assistant messages
        content = contentParts.map(part => {
          if (part.type === 'text') {
            return (part as TextContentPart).text;
          } else if (part.type === 'image_url') {
            const imgPart = part as ImageContentPart;
            return `[Image: ${imgPart.image_url.url.substring(0, 50)}...]`;
          } else {
            return '[Non-text content]';
          }
        }).join(' ');
      }
      
      // Skip if still no meaningful content
      if (!content) {
        continue;
      }

      const assistantMessage: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
        role: 'assistant',
        content,
      };
      
      aiMessages.push(assistantMessage);
      
      // For bot messages, check for stored tool calls
      const toolCallData = toolCallsStore.getToolCallsForMessage(message);
      if (toolCallData && toolCallData.toolCalls && toolCallData.toolCalls.length > 0) {
        // Insert tool calls before the bot response
        const botMessage = aiMessages.pop()!;
        
        // Add tool call message
        const toolCallMessage: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
          role: 'assistant',
          content: null,
          tool_calls: toolCallData.toolCalls
        };
        aiMessages.push(toolCallMessage);
        
        // Add tool results
        for (let i = 0; i < toolCallData.toolResults.length; i++) {
          const toolResult = toolCallData.toolResults[i];
          const toolCall = toolCallData.toolCalls[i];
          
          if (toolResult && toolCall) {
            const toolMessage: OpenAI.Chat.Completions.ChatCompletionToolMessageParam = {
              role: 'tool',
              content: toolResult.content,
              tool_call_id: toolCall.id
            };
            aiMessages.push(toolMessage);
          }
        }
        
        // Re-add bot response
        aiMessages.push(botMessage);
      }
    }
  }
  
  // Add current query if provided
  if (query?.trim()) {
    const queryMessage: OpenAI.Chat.Completions.ChatCompletionUserMessageParam = {
      role: 'user',
      content: query.trim()
    };
    aiMessages.push(queryMessage);
  }
  
  return aiMessages;
}

/**
 * Extract query from mention
 */
export function extractQueryFromMention(content: string, clientId: string): string {
  return content.replace(new RegExp(`<@!?${clientId}>`, 'g'), '').trim();
}

/**
 * Send message, splitting if too long
 */
export async function sendSplitMessage(
  channel: TextChannel, 
  content: string, 
  replyMessage: Message
): Promise<Message | undefined> {
  const MAX_LENGTH = 1990;

  if (!content?.trim()) {
    return await replyMessage.reply("I processed your request but have no specific response.");
  }

  if (content.length <= MAX_LENGTH) {
    return await replyMessage.reply(content);
  }

  // Split long messages
  const parts = splitContent(content, MAX_LENGTH);
  
  // Send first part as reply
  const firstPart = parts.shift();
  let firstSentMessage: Message | undefined;
  
  if (firstPart?.trim()) {
    firstSentMessage = await replyMessage.reply(firstPart);
  }

  // Send remaining parts
  for (const part of parts) {
    if (part?.trim()) {
      await channel.send(part);
    }
  }
  
  return firstSentMessage;
}

/**
 * Split content into chunks that fit Discord's message limit
 */
function splitContent(content: string, maxLength: number): string[] {
  const parts: string[] = [];
  let currentPart = '';

  const lines = content.split('\n');
  
  for (const line of lines) {
    if (currentPart.length + line.length + 1 > maxLength) {
      if (currentPart.length > 0) {
        parts.push(currentPart);
      }
      
      currentPart = line;
      
      // Handle very long lines
      while (currentPart.length > maxLength) {
        parts.push(currentPart.substring(0, maxLength));
        currentPart = currentPart.substring(maxLength);
      }
    } else {
      if (currentPart.length > 0) {
        currentPart += '\n';
      }
      currentPart += line;
    }
  }
  
  if (currentPart.length > 0) {
    parts.push(currentPart);
  }

  return parts.length > 0 ? parts : [content.substring(0, maxLength)];
} 