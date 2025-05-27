import { Client, Events, GatewayIntentBits, Collection } from 'discord.js';
import type { SlashCommandBuilder, ChatInputCommandInteraction, Interaction, ClientOptions } from 'discord.js';
import { config, validateConfig } from './config/config';
import type { BotConfig } from './config/config';
import { handleMessage } from './events/message-handler';
import fs from 'node:fs';
import path from 'node:path';

export interface Command {
  data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

class ExtendedClient extends Client {
  commands: Collection<string, Command>;
  constructor(options: ClientOptions) {
    super(options);
    this.commands = new Collection<string, Command>();
  }
}

// Validate configuration
if (!validateConfig()) {
  console.error('Invalid configuration. Please check your environment variables.');
  process.exit(1);
}

const typedConfig = config as BotConfig;

// Create client
const client = new ExtendedClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Load commands
loadCommands();

// Event handlers
client.once(Events.ClientReady, readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  
  if (typedConfig.enabledGuildIds?.length > 0) {
    console.log(`Configured for ${typedConfig.enabledGuildIds.length} guild(s)`);
  }
  
  if (client.commands.size > 0) {
    console.log(`Loaded ${client.commands.size} slash command(s): ${client.commands.map(c => c.data.name).join(', ')}`);
  }
});

client.on(Events.MessageCreate, async message => {
  await handleMessage(message, client);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`Command not found: ${interaction.commandName}`);
    await interaction.reply({ content: 'Error: Command not found.', ephemeral: true });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Command execution error:', error);
    const errorMessage = 'There was an error while executing this command!';
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Login
client.login(typedConfig.token).catch(error => {
  console.error('Login failed:', error);
  process.exit(1);
});

function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => 
    file.endsWith('.ts') || file.endsWith('.js')
  );

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const commandModule = require(filePath);
      const command: Command = commandModule.default || commandModule;

      if (command.data && typeof command.execute === 'function') {
        client.commands.set(command.data.name, command);
        console.log(`Loaded command: ${command.data.name}`);
      } else {
        console.warn(`Invalid command file: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error loading command ${filePath}:`, error);
    }
  }
}