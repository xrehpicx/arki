import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { OpenProjectApiClient } from '../tools/openproject-agent/api-client';

export const data = new SlashCommandBuilder()
  .setName('op-list-projects')
  .setDescription('List all available projects in OpenProject');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const client = new OpenProjectApiClient();
    console.log('[OpenProjectCommand] Fetching projects list...');
    
    const response = await client.listProjects();
    const projects = response._embedded.elements;

    if (projects.length === 0) {
      await interaction.editReply({ content: 'No projects found in OpenProject.' });
      return;
    }

    let result = `**OpenProject Projects (${projects.length} found)**\n\n`;
    
    projects.forEach((project, index) => {
      result += `**${index + 1}. ${project.name}**\n`;
      result += `   • ID: ${project.id}\n`;
      result += `   • Identifier: ${project.identifier}\n`;
      result += `   • Status: ${project.active ? '✅ Active' : '❌ Inactive'}\n`;
      result += `   • Public: ${project.public ? 'Yes' : 'No'}\n`;
      
      if (project.description?.raw) {
        const description = project.description.raw.substring(0, 100);
        result += `   • Description: ${description}${project.description.raw.length > 100 ? '...' : ''}\n`;
      }
      
      if (project.homepage) {
        result += `   • Homepage: ${project.homepage}\n`;
      }
      
      result += `   • Created: ${new Date(project.createdAt).toLocaleDateString()}\n`;
      result += `   • Updated: ${new Date(project.updatedAt).toLocaleDateString()}\n\n`;
    });

    // Split message if too long for Discord
    if (result.length > 2000) {
      const chunks = [];
      let currentChunk = '';
      const lines = result.split('\n');
      
      for (const line of lines) {
        if (currentChunk.length + line.length + 1 > 2000) {
          chunks.push(currentChunk);
          currentChunk = line;
        } else {
          currentChunk += (currentChunk ? '\n' : '') + line;
        }
      }
      if (currentChunk) chunks.push(currentChunk);
      
      await interaction.editReply({ content: chunks[0] });
      
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({ content: chunks[i] });
      }
    } else {
      await interaction.editReply({ content: result });
    }

    console.log(`[OpenProjectCommand] Successfully retrieved ${projects.length} projects`);

  } catch (error) {
    console.error('[OpenProjectCommand] Error listing projects:', error);
    await interaction.editReply({ 
      content: `Error listing projects: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
} 