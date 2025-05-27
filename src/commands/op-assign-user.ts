import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { OpenProjectApiClient } from '../tools/openproject-agent/api-client';
import type { UpdateWorkPackageRequest } from '../tools/openproject-agent/types';

export const data = new SlashCommandBuilder()
  .setName('op-assign-user')
  .setDescription('Assign or reassign users to work packages in OpenProject')
  .addIntegerOption(option =>
    option.setName('work_package_id')
      .setDescription('ID of the work package to assign users to')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('assignee_id')
      .setDescription('ID of the user to assign as the assignee (responsible for completing the work)')
      .setRequired(false))
  .addIntegerOption(option =>
    option.setName('responsible_id')
      .setDescription('ID of the user to assign as responsible (accountable for the work)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('assignee_name')
      .setDescription('Name or login of the user to assign as assignee (alternative to assignee_id)')
      .setRequired(false))
  .addStringOption(option =>
    option.setName('responsible_name')
      .setDescription('Name or login of the user to assign as responsible (alternative to responsible_id)')
      .setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const client = new OpenProjectApiClient();
    
    const workPackageId = interaction.options.getInteger('work_package_id', true);
    const assigneeId = interaction.options.getInteger('assignee_id');
    const responsibleId = interaction.options.getInteger('responsible_id');
    const assigneeName = interaction.options.getString('assignee_name');
    const responsibleName = interaction.options.getString('responsible_name');

    // Get the current work package to check lock version
    console.log(`[OpenProjectCommand] Getting work package #${workPackageId}...`);
    const workPackage = await client.getWorkPackage(workPackageId);

    // Resolve user IDs if names were provided
    let finalAssigneeId = assigneeId;
    let finalResponsibleId = responsibleId;

    if (assigneeName && !finalAssigneeId) {
      console.log(`[OpenProjectCommand] Searching for assignee: ${assigneeName}`);
      const usersResponse = await client.searchUsers(assigneeName);
      const users = usersResponse._embedded.elements;
      const user = users.find(u => 
        u.name.toLowerCase().includes(assigneeName.toLowerCase()) ||
        u.login.toLowerCase().includes(assigneeName.toLowerCase())
      );
      if (!user) {
        await interaction.editReply({ 
          content: `User not found: ${assigneeName}. Use /op-search-users to see available users.` 
        });
        return;
      }
      finalAssigneeId = user.id;
    }

    if (responsibleName && !finalResponsibleId) {
      console.log(`[OpenProjectCommand] Searching for responsible: ${responsibleName}`);
      const usersResponse = await client.searchUsers(responsibleName);
      const users = usersResponse._embedded.elements;
      const user = users.find(u => 
        u.name.toLowerCase().includes(responsibleName.toLowerCase()) ||
        u.login.toLowerCase().includes(responsibleName.toLowerCase())
      );
      if (!user) {
        await interaction.editReply({ 
          content: `User not found: ${responsibleName}. Use /op-search-users to see available users.` 
        });
        return;
      }
      finalResponsibleId = user.id;
    }

    // Check if we have any assignments to make
    if (!finalAssigneeId && !finalResponsibleId) {
      await interaction.editReply({ 
        content: 'No assignee or responsible user specified. Please provide assignee_id/assignee_name or responsible_id/responsible_name.' 
      });
      return;
    }

    // Build update request
    const updateData: UpdateWorkPackageRequest = {
      lockVersion: workPackage.lockVersion,
      _links: {}
    };

    if (finalAssigneeId) {
      updateData._links!.assignee = { href: client.buildUserHref(finalAssigneeId) };
    }
    if (finalResponsibleId) {
      updateData._links!.responsible = { href: client.buildUserHref(finalResponsibleId) };
    }

    console.log(`[OpenProjectCommand] Updating work package assignments...`);
    const updatedWorkPackage = await client.updateWorkPackage(workPackageId, updateData);

    let result = `**✅ Work Package Assignments Updated**\n\n`;
    result += `**#${updatedWorkPackage.id}: ${updatedWorkPackage.subject}**\n`;
    result += `• Project: ${updatedWorkPackage._links.project.title}\n`;
    result += `• Status: ${updatedWorkPackage._links.status.title}\n`;
    
    if (updatedWorkPackage._links.assignee) {
      result += `• ✅ Assignee: ${updatedWorkPackage._links.assignee.title}\n`;
    } else {
      result += `• Assignee: Not assigned\n`;
    }
    
    if (updatedWorkPackage._links.responsible) {
      result += `• ✅ Responsible: ${updatedWorkPackage._links.responsible.title}\n`;
    } else {
      result += `• Responsible: Not assigned\n`;
    }
    
    result += `• Updated: ${new Date(updatedWorkPackage.updatedAt).toLocaleString()}\n`;
    result += `\n🔗 **View:** ${updatedWorkPackage._links.self.href.replace('/api/v3', '')}`;

    await interaction.editReply({ content: result });

    console.log(`[OpenProjectCommand] Successfully updated assignments for work package #${workPackageId}`);

  } catch (error) {
    console.error('[OpenProjectCommand] Error assigning user:', error);
    await interaction.editReply({ 
      content: `Error assigning user: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
} 