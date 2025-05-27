import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, PermissionFlagsBits, MessageFlags, DiscordAPIError } from 'discord.js';
import { setAnchorMessageId as storeAnchorId } from '../utils/anchorMessageUtils';

export const data = new SlashCommandBuilder()
    .setName('set-anchor')
    .setDescription('Marks a new point from which Arki will fetch chat history in this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages); // Only users who can manage messages

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.channel || !('send' in interaction.channel) || interaction.channel.isDMBased()) {
        await interaction.reply({ content: 'This command can only be used in server text-based channels.', flags: MessageFlags.Ephemeral });
        return;
    }
    // Ensure command is used in a guild context where channelId is available
    if (!interaction.guildId || !interaction.channelId) {
         await interaction.reply({ content: 'This command must be used within a server channel.', flags: MessageFlags.Ephemeral });
        return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const anchorMessageText = "📌 **This message now marks the beginning of the retrieved chat history.** Older messages will be ignored by Arki.";
        const anchorMessage = await interaction.channel.send(anchorMessageText);
        
        const channelId = interaction.channelId;
        const messageId = anchorMessage.id;

        await storeAnchorId(channelId, messageId);

        await interaction.editReply({ content: `✅ Anchor point set. Arki will now only consider messages in this channel created after the one above (ID: ${messageId}).` });

    } catch (error) {
        console.error('Failed to set anchor message:', error);
        let errorMessage = 'There was an error trying to set the anchor message.';
        // Check for specific discord.js error for missing permissions
        if (error instanceof DiscordAPIError && error.code === 50013) { // MissingPermissions
            errorMessage = 'I do not have permissions to send messages in this channel. Please check my permissions.';
        }
        await interaction.editReply({ content: errorMessage });
    }
} 