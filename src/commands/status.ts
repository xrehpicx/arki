import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import * as os from 'os';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Displays the status of the bot and the system it is running on.');

export async function execute(interaction: ChatInputCommandInteraction) {
  const uptimeSeconds = os.uptime();
  const uptimeHours = Math.floor(uptimeSeconds / 3600);
  const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptimeSecs = Math.floor(uptimeSeconds % 60);

  const totalMemoryGB = (os.totalmem() / (1024 ** 3)).toFixed(2);
  const freeMemoryGB = (os.freemem() / (1024 ** 3)).toFixed(2);

  const replyContent = `
**Bot & System Status**

**Host System:**
- **OS Platform:** ${os.platform()}
- **OS Release:** ${os.release()}
- **CPU Architecture:** ${os.arch()}
- **CPU Cores:** ${os.cpus().length}
- **Total Memory:** ${totalMemoryGB} GB
- **Free Memory:** ${freeMemoryGB} GB
- **System Uptime:** ${uptimeHours}h ${uptimeMinutes}m ${uptimeSecs}s

**Bot:**
- **Status:** Online
- **Ping:** ${interaction.client.ws.ping}ms
  `;

  await interaction.reply({ content: replyContent, ephemeral: true });
} 