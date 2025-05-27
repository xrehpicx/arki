import { Guild, Message } from 'discord.js';
import type { Channel, TextChannel, NewsChannel, ThreadChannel } from 'discord.js';

interface PromptContext {
  guild?: Guild;
  channel?: Channel;
  message?: Message;
}

/**
 * Generate a system prompt with additional context from Discord
 * @param basePrompt The base system prompt from configuration
 * @param context Additional context from Discord (guild, channel, message)
 * @returns Enhanced system prompt with context
 */
export const generateSystemPrompt = (basePrompt: string, context: PromptContext): string => {
  const { guild, channel, message } = context;
  
  // Enhance the base prompt with multimodal capabilities
  let enhancedPrompt = basePrompt;
  
  // Add explicit multimodal support information
  enhancedPrompt += `
  
**You have native multimodal capabilities:**
- 🖼️ **Images**: You can directly see and analyze images shared in Discord. Describe what you see, answer questions about images, and provide detailed analysis.
- 🎵 **Audio**: You can process audio content when available.
- 📝 **Text**: You can read and respond to text messages with full context.
- 🔗 **Attachments**: You can understand various file types and content.

When users share images, analyze them thoroughly and provide helpful, detailed responses about what you observe.`;
  
  // Add guild/server context
  if (guild) {
    enhancedPrompt += `\n\nYou are currently in the Discord server: "${guild.name}".`;
    
    if (guild.description) {
      enhancedPrompt += ` The server description is: "${guild.description}".`;
    }
    
    enhancedPrompt += ` The server has ${guild.memberCount} members.`;
  }
  
  // Add channel context
  if (channel) {
    // Check if channel has a name property (most channel types do)
    const channelName = 
      'name' in channel ? channel.name : 'Unknown Channel';
    
    enhancedPrompt += `\n\nYou are responding in the channel: "${channelName}".`;
    
    // Check for channel topic (only on certain channel types)
    if (
      (channel.type === 0 || channel.type === 5 || channel.type === 10) && // TextChannel, NewsChannel, ThreadChannel
      'topic' in channel && 
      channel.topic
    ) {
      enhancedPrompt += ` The channel topic is: "${channel.topic}".`;
    }
  }
  
  // Add message context if needed
  if (message && message.author) {
    enhancedPrompt += `\n\nYou were mentioned by the user: ${message.author.username}.`;
  }
  
  return enhancedPrompt;
}; 