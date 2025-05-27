import { REST, Routes } from 'discord.js';
import type { APIUser } from 'discord.js';
import { config, validateConfig } from './config/config';
import type { BotConfig } from './config/config';
import fs from 'node:fs';
import path from 'node:path';

// Validate configuration
if (!validateConfig()) {
  console.error('Invalid configuration. Cannot deploy commands.');
  process.exit(1);
}

const typedConfig = config as BotConfig;

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

console.log('Loading commands from:', commandsPath);
console.log('Found command files:', commandFiles);

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const command = require(filePath);
    if (command.data && typeof command.data.toJSON === 'function') {
      commands.push(command.data.toJSON());
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`[WARNING] The command at ${filePath} is missing a required "data" property or toJSON method.`);
    }
  } catch (error) {
    console.error(`Error loading command at ${filePath}:`, error);
  }
}

if (commands.length === 0) {
    console.log('No commands found to deploy.');
    process.exit(0);
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(typedConfig.token);

// Deploy commands
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    let route: `/${string}`;
    if (typedConfig.enabledGuildIds && typedConfig.enabledGuildIds.length > 0 && typedConfig.enabledGuildIds[0]) {
        const guildId = typedConfig.enabledGuildIds[0];
        route = Routes.applicationGuildCommands(typedConfig.clientId, guildId);
        console.log(`Deploying commands to guild: ${guildId}. This is recommended for development.`);
    } else {
        route = Routes.applicationCommands(typedConfig.clientId);
        console.log('Deploying commands globally. This may take up to an hour to propagate.');
    }

    const data = await rest.put(
      route,
      { body: commands },
    ) as Array<unknown>;

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
})(); 