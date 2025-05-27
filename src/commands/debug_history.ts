import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import { config } from "../config/config";
import {
  fetchRecentMessages,
  convertToAIMessages,
} from "../utils/message-utils";
import type { AIMessage, MessageContentPart, TextContentPart, ImageContentPart, AudioContentPart } from "../services/ai/types";
import type OpenAI from "openai";

export const data = new SlashCommandBuilder()
  .setName("debug_history")
  .setDescription(
    "Displays recent message history with native multimodal content parsing (images, audio, etc.)"
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.channel || !(interaction.channel instanceof TextChannel)) {
    await interaction.reply({
      content: "This command can only be used in text channels.",
      flags: 64, // 64 = EPHEMERAL flag
    });
    return;
  }

  await interaction.deferReply({ flags: 64 }); // 64 = EPHEMERAL flag

  try {
    // Fetch recent messages from the channel
    const recentMessages = await fetchRecentMessages(
      interaction.channel as TextChannel,
      config.ai.messageHistoryLimit
    );

    // Convert to AI format to see the multimodal parsing
    const aiMessages: AIMessage[] = await convertToAIMessages(
      recentMessages,
      "debug_history command"
    );

    if (aiMessages.length === 0) {
      await interaction.editReply({ 
        content: "No messages found in recent history." 
      });
      return;
    }

    // Create a summary of the multimodal conversion
    let output = "**Enhanced Message History (Native Multimodal Format)**\n\n";
    
    for (let index = 0; index < aiMessages.length; index++) {
      const msg = aiMessages[index];
      if (!msg) continue; // Safety check
      
      const roleEmoji = msg.role === 'user' ? '👤' : 
                       msg.role === 'assistant' ? '🤖' : 
                       msg.role === 'tool' ? '🛠️' : '⚙️';
      
      output += `**${index + 1}. ${roleEmoji} ${msg.role.toUpperCase()}**`;
      
      // Check if this is a user message with name field
      if (msg.role === 'user' && 'name' in msg && msg.name) {
        output += ` (${msg.name})`;
      }
      
      output += '\n';
      
      // Handle different content types
      if (msg.content) {
        if (typeof msg.content === 'string') {
          // Simple text content
          const contentPreview = msg.content.length > 200 
            ? msg.content.substring(0, 200) + '...' 
            : msg.content;
          output += `📝 **Text**: ${contentPreview}\n`;
        } else if (Array.isArray(msg.content)) {
          // Multimodal content array
          output += `🎨 **Multimodal Content** (${msg.content.length} parts):\n`;
          
          (msg.content as MessageContentPart[]).forEach((part: MessageContentPart, partIndex: number) => {
            switch (part.type) {
              case 'text':
                const textPart = part as TextContentPart;
                const textPreview = textPart.text.length > 100 
                  ? textPart.text.substring(0, 100) + '...' 
                  : textPart.text;
                output += `  ${partIndex + 1}. 📝 Text: "${textPreview}"\n`;
                break;
              
              case 'image_url':
                const imagePart = part as ImageContentPart;
                output += `  ${partIndex + 1}. 🖼️ **Native Image**: ${imagePart.image_url.url} (detail: ${imagePart.image_url.detail || 'auto'})\n`;
                break;
              
              case 'input_audio':
                const audioPart = part as AudioContentPart;
                output += `  ${partIndex + 1}. 🎵 **Native Audio**: ${audioPart.input_audio.format} format\n`;
                break;
              
              default:
                output += `  ${partIndex + 1}. ❓ Unknown type: ${(part as any).type}\n`;
            }
          });
        }
      } else {
        output += '_No content_\n';
      }
      
      // Show tool calls if present (only for assistant messages)
      if (msg.role === 'assistant' && 'tool_calls' in msg && msg.tool_calls && msg.tool_calls.length > 0) {
        output += `🛠️ **Tool Calls**: ${msg.tool_calls.length} tool(s)\n`;
      }
      
      output += '\n';
      
      // Discord message limit check
      if (output.length > 1600) {
        output += `... (${aiMessages.length - index - 1} more messages truncated)`;
        break;
      }
    }

    // Add feature highlights
    output += "\n**🎯 Native Multimodal Features:**\n";
    output += "✅ **Images**: Native OpenAI image_url support (no text conversion!)\n";
    output += "✅ **Audio**: Ready for native audio input (base64 format)\n";
    output += "✅ **Text**: Rich text content with context\n";
    output += "✅ **Usernames**: Included in OpenAI name field + content\n";
    output += "✅ **Attachments**: Smart conversion (native vs text description)\n";
    output += "✅ **Discord Features**: Embeds, stickers, reactions as text\n";
    output += "✅ **Tool Integration**: Seamless tool call context preservation\n";
    output += "\n💡 **Performance**: Images sent natively to AI models for better understanding!";

    await interaction.editReply({ content: output });

  } catch (error) {
    console.error('Error in debug_history command:', error);
    await interaction.editReply({ 
      content: "Error fetching message history." 
    });
  }
}
