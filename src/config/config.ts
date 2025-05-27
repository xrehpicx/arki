import dotenv from 'dotenv';
import path from 'path';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

// Define configuration types
export interface GuildPermissions {
  allowedUsers: string[];
  allowedRoles?: string[];
}

export interface AIConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  messageHistoryLimit: number;
  maxTokens?: number; // Optional - let Discord handle truncation
}

export interface OpenProjectConfig {
  baseUrl: string;
  apiKey: string;
}

export type { BotConfig }; // Explicitly export BotConfig as a type
interface BotConfig {
  token: string;
  clientId: string;
  enabledGuildIds: string[];
  guildPermissions: Record<string, GuildPermissions>;
  ai: AIConfig;
  openProject: OpenProjectConfig;
}

// Get permission configurations from JSON file
const loadPermissionsConfig = (): Record<string, GuildPermissions> => {
  try {
    const configPath = path.resolve(__dirname, 'permissions.json');
    const configFile = readFileSync(configPath, 'utf-8');
    const permissionsData = JSON.parse(configFile) as Record<string, GuildPermissions>;

    // Validate loaded permissions
    for (const guildId in permissionsData) {
      const perm = permissionsData[guildId];
      if (perm) {
        if ((!perm.allowedRoles || perm.allowedRoles.length === 0) && (!perm.allowedUsers || perm.allowedUsers.length === 0)) {
          console.warn(`Permissions configuration for guild ${guildId} is invalid: if allowedRoles is missing or empty, allowedUsers must be present and non-empty. This guild's permissions might not work as expected.`);
          // Optionally, delete or modify this invalid entry: delete permissionsData[guildId];
        }
      }
    }
    return permissionsData;
  } catch (error) {
    // console.warn('Unable to load permissions config, using empty config');
    return {}; // Return empty if not found, less noisy for optional config
  }
};

// Create config object
export const config: BotConfig = {
  token: process.env.DISCORD_BOT_TOKEN || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
  enabledGuildIds: (process.env.ENABLED_GUILD_IDS || '').split(',').filter(Boolean),
  guildPermissions: loadPermissionsConfig(),
  ai: {
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    modelName: process.env.AI_MODEL_NAME || 'mistralai/mistral-7b-instruct',
    messageHistoryLimit: parseInt(process.env.MESSAGE_HISTORY_LIMIT || '10', 10),
  },
  openProject: {
    baseUrl: process.env.OPENPROJECT_BASE_URL || '',
    apiKey: process.env.OPENPROJECT_API_KEY || '',
  },
};

// Validate the configuration
export const validateConfig = (): boolean => {
  if (!config.token) {
    console.error('Missing DISCORD_BOT_TOKEN in environment variables');
    return false;
  }
  
  if (!config.clientId) {
    console.error('Missing DISCORD_CLIENT_ID in environment variables');
    return false;
  }
  
  if (!config.ai.apiKey) {
    console.error('Missing OPENROUTER_API_KEY in environment variables');
    return false;
  }

  if (!config.openProject.baseUrl) {
    console.error('Missing OPENPROJECT_BASE_URL in environment variables');
    return false;
  }

  if (!config.openProject.apiKey) {
    console.error('Missing OPENPROJECT_API_KEY in environment variables');
    return false;
  }
  
  // It's okay if enabledGuildIds is empty, means global or no specific restriction from this config
  // if (config.enabledGuildIds.length === 0) {
  //   console.warn('No enabled guild IDs configured, bot may operate globally or based on permissions file only for specifics.');
  // }
  
  return true;
};

export default config; 