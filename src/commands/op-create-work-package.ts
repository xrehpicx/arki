import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { OpenProjectApiClient } from '../tools/openproject-agent/api-client';
import type { CreateWorkPackageRequest } from '../tools/openproject-agent/types';

export const data = new SlashCommandBuilder()
  .setName('op-create-work-package')
  .setDescription('Create a new work package (issue) in OpenProject')
  .addIntegerOption(option =>
    option.setName('project_id')
      .setDescription('ID of the project to create the work package in')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('subject')
      .setDescription('Title/subject of the work package')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('description')
      .setDescription('Detailed description of the work package (supports markdown)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('type_id')
      .setDescription('ID of the work package type (e.g., Task, Bug, Feature). Default: 1')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('status_id')
      .setDescription('ID of the initial status. If not provided, default status will be used')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('priority_id')
      .setDescription('ID of the priority level. If not provided, default priority will be used')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('assignee_id')
      .setDescription('ID of the user to assign the work package to')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('responsible_id')
      .setDescription('ID of the user who is responsible for the work package')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('start_date')
      .setDescription('Start date in YYYY-MM-DD format')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('due_date')
      .setDescription('Due date in YYYY-MM-DD format')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('estimated_time')
      .setDescription('Estimated time (e.g., "8h", "2d")')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('percentage_done')
      .setDescription('Percentage completion (0-100)')
      .setMinValue(0)
      .setMaxValue(100)
      .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const client = new OpenProjectApiClient();
    
    // Get required parameters
    const projectId = interaction.options.getInteger('project_id', true);
    const subject = interaction.options.getString('subject', true);
    
    // Get optional parameters
    const description = interaction.options.getString('description');
    const typeId = interaction.options.getInteger('type_id');
    const statusId = interaction.options.getInteger('status_id');
    const priorityId = interaction.options.getInteger('priority_id');
    const assigneeId = interaction.options.getInteger('assignee_id');
    const responsibleId = interaction.options.getInteger('responsible_id');
    const startDate = interaction.options.getString('start_date');
    const dueDate = interaction.options.getString('due_date');
    const estimatedTime = interaction.options.getString('estimated_time');
    const percentageDone = interaction.options.getInteger('percentage_done');

    console.log(`[OpenProjectCommand] Creating work package: "${subject}"`);

    // Build the create request
    const createData: CreateWorkPackageRequest = {
      subject: subject,
      _links: {
        project: { href: client.buildProjectHref(projectId) },
        type: { href: client.buildTypeHref(typeId || 1) }, // Default to type 1 if not specified
      },
    };

    // Add optional description
    if (description) {
      createData.description = {
        format: 'markdown',
        raw: description,
      };
    }

    // Add optional links
    if (statusId) {
      createData._links.status = { href: client.buildStatusHref(statusId) };
    }
    if (priorityId) {
      createData._links.priority = { href: client.buildPriorityHref(priorityId) };
    }
    if (assigneeId) {
      createData._links.assignee = { href: client.buildUserHref(assigneeId) };
    }
    if (responsibleId) {
      createData._links.responsible = { href: client.buildUserHref(responsibleId) };
    }

    // Add optional dates and time
    if (startDate) {
      createData.startDate = startDate;
    }
    if (dueDate) {
      createData.dueDate = dueDate;
    }
    if (estimatedTime) {
      createData.estimatedTime = estimatedTime;
    }
    if (percentageDone !== null) {
      createData.percentageDone = percentageDone;
    }

    const workPackage = await client.createWorkPackage(createData);

    let result = `**✅ Work Package Created Successfully**\n\n`;
    result += `**${workPackage.subject}**\n`;
    result += `• ID: #${workPackage.id}\n`;
    result += `• Project: ${workPackage._links.project.title}\n`;
    result += `• Type: ${workPackage._links.type.title}\n`;
    result += `• Status: ${workPackage._links.status.title}\n`;
    result += `• Priority: ${workPackage._links.priority.title}\n`;
    result += `• Author: ${workPackage._links.author.title}\n`;
    
    if (workPackage._links.assignee) {
      result += `• Assignee: ${workPackage._links.assignee.title}\n`;
    }
    if (workPackage._links.responsible) {
      result += `• Responsible: ${workPackage._links.responsible.title}\n`;
    }
    if (workPackage.startDate) {
      result += `• Start Date: ${workPackage.startDate}\n`;
    }
    if (workPackage.dueDate) {
      result += `• Due Date: ${workPackage.dueDate}\n`;
    }
    if (workPackage.estimatedTime) {
      result += `• Estimated Time: ${workPackage.estimatedTime}\n`;
    }
    
    result += `• Progress: ${workPackage.percentageDone}%\n`;
    result += `• Created: ${new Date(workPackage.createdAt).toLocaleString()}\n`;
    
    if (workPackage.description?.raw) {
      result += `\n**Description:**\n${workPackage.description.raw}\n`;
    }

    result += `\n🔗 **View:** ${workPackage._links.self.href.replace('/api/v3', '')}`;

    await interaction.editReply({ content: result });

    console.log(`[OpenProjectCommand] Successfully created work package #${workPackage.id}`);

  } catch (error) {
    console.error('[OpenProjectCommand] Error creating work package:', error);
    await interaction.editReply({ 
      content: `Error creating work package: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
} 