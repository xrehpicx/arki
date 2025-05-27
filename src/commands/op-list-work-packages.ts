import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { OpenProjectApiClient } from '../tools/openproject-agent/api-client';
import type { WorkPackageFilters } from '../tools/openproject-agent/types';

export const data = new SlashCommandBuilder()
  .setName('op-list-work-packages')
  .setDescription('List and filter work packages (issues) in OpenProject')
  .addStringOption(option =>
    option.setName('project')
      .setDescription('Filter by project ID or identifier')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('assignee_id')
      .setDescription('Filter by assignee user ID')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('responsible_id')
      .setDescription('Filter by responsible user ID')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('status')
      .setDescription('Filter by status name (e.g., New, In Progress, Closed)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('type')
      .setDescription('Filter by work package type (e.g., Task, Bug, Feature)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('priority')
      .setDescription('Filter by priority (e.g., Low, Normal, High, Immediate)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('author_id')
      .setDescription('Filter by author/creator user ID')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('subject')
      .setDescription('Filter by subject/title containing this text')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('created_after')
      .setDescription('Filter work packages created after this date (YYYY-MM-DD)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('created_before')
      .setDescription('Filter work packages created before this date (YYYY-MM-DD)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Maximum number of results to return (default: 20, max: 100)')
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const client = new OpenProjectApiClient();
    console.log('[OpenProjectCommand] Fetching work packages with filters...');

    // Build filters object from command options
    const filters: WorkPackageFilters = {};

    const project = interaction.options.getString('project');
    const assigneeId = interaction.options.getInteger('assignee_id');
    const responsibleId = interaction.options.getInteger('responsible_id');
    const status = interaction.options.getString('status');
    const type = interaction.options.getString('type');
    const priority = interaction.options.getString('priority');
    const authorId = interaction.options.getInteger('author_id');
    const subject = interaction.options.getString('subject');
    const createdAfter = interaction.options.getString('created_after');
    const createdBefore = interaction.options.getString('created_before');
    const limit = interaction.options.getInteger('limit') || 20;

    if (project !== null) filters.project = project;
    if (assigneeId !== null) filters.assignee = String(assigneeId);
    if (responsibleId !== null) filters.responsible = String(responsibleId);
    if (status !== null) filters.status = status;
    if (type !== null) filters.type = type;
    if (priority !== null) filters.priority = priority;
    if (authorId !== null) filters.author = String(authorId);
    if (subject !== null) filters.subject = subject;

    // Date filters
    if (createdAfter && createdBefore) {
      filters.createdAt = `<>d:${createdAfter}T00:00:00Z,${createdBefore}T23:59:59Z`;
    } else if (createdAfter) {
      filters.createdAt = `>=${createdAfter}T00:00:00Z`;
    } else if (createdBefore) {
      filters.createdAt = `<${createdBefore}T23:59:59Z`;
    }

    const response = await client.listWorkPackages(filters);
    const workPackages = response._embedded.elements;

    // Apply limit
    const limitedWorkPackages = workPackages.slice(0, limit);

    if (workPackages.length === 0) {
      await interaction.editReply({ content: 'No work packages found matching the specified filters.' });
      return;
    }

    let result = `**Work Packages Found: ${workPackages.length}**`;
    if (limitedWorkPackages.length < workPackages.length) {
      result += ` (showing first ${limitedWorkPackages.length})`;
    }
    result += '\n\n';

    // Display applied filters
    const appliedFilters = Object.keys(filters);
    if (appliedFilters.length > 0) {
      result += `**Applied Filters:** ${appliedFilters.join(', ')}\n\n`;
    }

    limitedWorkPackages.forEach((wp, index) => {
      result += `**${index + 1}. #${wp.id}: ${wp.subject}**\n`;
      result += `   • Project: ${wp._links.project.title}\n`;
      result += `   • Type: ${wp._links.type.title}\n`;
      result += `   • Status: ${wp._links.status.title}\n`;
      result += `   • Priority: ${wp._links.priority.title}\n`;
      result += `   • Author: ${wp._links.author.title}\n`;
      
      if (wp._links.assignee) {
        result += `   • Assignee: ${wp._links.assignee.title}\n`;
      }
      if (wp._links.responsible) {
        result += `   • Responsible: ${wp._links.responsible.title}\n`;
      }
      
      result += `   • Progress: ${wp.percentageDone}%\n`;
      
      if (wp.startDate) {
        result += `   • Start Date: ${wp.startDate}\n`;
      }
      if (wp.dueDate) {
        result += `   • Due Date: ${wp.dueDate}\n`;
      }
      if (wp.estimatedTime) {
        result += `   • Estimated: ${wp.estimatedTime}\n`;
      }
      if (wp.spentTime) {
        result += `   • Spent: ${wp.spentTime}\n`;
      }
      
      result += `   • Created: ${new Date(wp.createdAt).toLocaleDateString()}\n`;
      result += `   • Updated: ${new Date(wp.updatedAt).toLocaleDateString()}\n`;
      
      // Show short description if available
      if (wp.description?.raw) {
        const shortDesc = wp.description.raw.substring(0, 100);
        result += `   • Description: ${shortDesc}${wp.description.raw.length > 100 ? '...' : ''}\n`;
      }
      
      result += `   • 🔗 View: ${wp._links.self.href.replace('/api/v3', '')}\n\n`;
    });

    if (limitedWorkPackages.length < workPackages.length) {
      result += `\n*Use the limit parameter to see more results (max 100)*`;
    }

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

    console.log(`[OpenProjectCommand] Successfully retrieved ${workPackages.length} work packages`);

  } catch (error) {
    console.error('[OpenProjectCommand] Error listing work packages:', error);
    await interaction.editReply({ 
      content: `Error listing work packages: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
} 