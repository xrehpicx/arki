import { GuildMember, Message } from 'discord.js';
import { config } from '../config/config';

/**
 * Check if a message author is allowed to interact with the bot
 * @param message Discord message to check
 * @returns boolean indicating if the user is allowed
 */
export const isUserAllowed = (message: Message): boolean => {
  const { guild, member } = message;
  
  // If no guild, deny access
  if (!guild || !member) return false;
  
  // Get permission config for this guild
  const guildPermissions = config.guildPermissions[guild.id];
  
  // If no specific permissions are configured for this guild, deny access
  if (!guildPermissions) return false;
  
  // Rule 1: If user ID is in allowed list, allow no matter what
  if (guildPermissions.allowedUsers && guildPermissions.allowedUsers.includes(member.id)) {
    return true;
  }
  
  // Rule 2: If user not in allowed list, check if their role is in allowed roles
  // This check is only performed if allowedRoles is defined and has entries.
  if (guildPermissions.allowedRoles && guildPermissions.allowedRoles.length > 0) {
    const memberRoles = (member as GuildMember).roles.cache;
    const hasAllowedRole = memberRoles.some(role => 
      guildPermissions.allowedRoles!.includes(role.name) // Non-null assertion as we checked length
    );
    if (hasAllowedRole) {
      return true;
    }
  }
  
  // If none of the above conditions are met, deny access
  return false;
};

/**
 * Checks if the bot was mentioned in a message
 * @param message Discord message to check
 * @param clientId The bot's client ID
 * @returns boolean indicating if the bot was mentioned
 */
export const isBotMentioned = (message: Message, clientId: string): boolean => {
  // Check direct mention
  return message.mentions.users.has(clientId);
}; 