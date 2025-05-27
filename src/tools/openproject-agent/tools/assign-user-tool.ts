import type { Tool, ToolParams } from '../../tools-registry';
import { OpenProjectApiClient } from '../api-client';
import type { UpdateWorkPackageRequest } from '../types';

interface AssignUserParams {
  work_package_id: number;
  assignee_id?: number;
  assignee_name?: string;
  responsible_id?: number;
  responsible_name?: string;
  list_users?: boolean;
}

export const assignUserTool: Tool = {
  name: 'assign_user',
  description: 'Assign or reassign users to work packages, or list available users for assignment',
  parameters: {
    type: 'object',
    properties: {
      work_package_id: {
        type: 'number',
        description: 'ID of the work package to assign users to',
      },
      assignee_id: {
        type: 'number',
        description: 'ID of the user to assign as the assignee (responsible for completing the work)',
      },
      assignee_name: {
        type: 'string',
        description: 'Name or login of the user to assign as assignee (alternative to assignee_id)',
      },
      responsible_id: {
        type: 'number',
        description: 'ID of the user to assign as responsible (accountable for the work)',
      },
      responsible_name: {
        type: 'string',
        description: 'Name or login of the user to assign as responsible (alternative to responsible_id)',
      },
      list_users: {
        type: 'boolean',
        description: 'Set to true to list all available users instead of making assignments',
      },
    },
    required: ['work_package_id'],
  },

  execute: async (args: ToolParams): Promise<string> => {
    const params = args as unknown as AssignUserParams;
    
    try {
      const client = new OpenProjectApiClient();

      // If list_users is requested, return user list
      if (params.list_users) {
        console.log('[OpenProjectAgent] Fetching users list...');
        const usersResponse = await client.listUsers();
        const users = usersResponse._embedded.elements;

        if (users.length === 0) {
          return 'No users found in OpenProject.';
        }

        let result = `**Available Users for Assignment (${users.length} found)**\n\n`;
        
        users.forEach((user, index) => {
          result += `**${index + 1}. ${user.name}**\n`;
          result += `   • ID: ${user.id}\n`;
          result += `   • Login: ${user.login}\n`;
          result += `   • Email: ${user.email}\n`;
          result += `   • Status: ${user.status}\n`;
          if (user.admin) {
            result += `   • Role: Administrator\n`;
          }
          result += '\n';
        });

        return result;
      }

      // Get the current work package to check lock version
      console.log(`[OpenProjectAgent] Getting work package #${params.work_package_id}...`);
      const workPackage = await client.getWorkPackage(params.work_package_id);

      // Resolve user IDs if names were provided
      let assigneeId = params.assignee_id;
      let responsibleId = params.responsible_id;

      if (params.assignee_name && !assigneeId) {
        console.log(`[OpenProjectAgent] Searching for assignee: ${params.assignee_name}`);
        const usersResponse = await client.searchUsers(params.assignee_name);
        const users = usersResponse._embedded.elements;
        const user = users.find(u => 
          u.name.toLowerCase().includes(params.assignee_name!.toLowerCase()) ||
          u.login.toLowerCase().includes(params.assignee_name!.toLowerCase())
        );
        if (!user) {
          return `User not found: ${params.assignee_name}. Use list_users: true to see available users.`;
        }
        assigneeId = user.id;
      }

      if (params.responsible_name && !responsibleId) {
        console.log(`[OpenProjectAgent] Searching for responsible: ${params.responsible_name}`);
        const usersResponse = await client.searchUsers(params.responsible_name);
        const users = usersResponse._embedded.elements;
        const user = users.find(u => 
          u.name.toLowerCase().includes(params.responsible_name!.toLowerCase()) ||
          u.login.toLowerCase().includes(params.responsible_name!.toLowerCase())
        );
        if (!user) {
          return `User not found: ${params.responsible_name}. Use list_users: true to see available users.`;
        }
        responsibleId = user.id;
      }

      // Check if we have any assignments to make
      if (!assigneeId && !responsibleId) {
        return 'No assignee or responsible user specified. Please provide assignee_id/assignee_name or responsible_id/responsible_name, or use list_users: true to see available users.';
      }

      // Build update request
      const updateData: UpdateWorkPackageRequest = {
        lockVersion: workPackage.lockVersion,
        _links: {}
      };

      if (assigneeId) {
        updateData._links!.assignee = { href: client.buildUserHref(assigneeId) };
      }
      if (responsibleId) {
        updateData._links!.responsible = { href: client.buildUserHref(responsibleId) };
      }

      console.log(`[OpenProjectAgent] Updating work package assignments...`);
      const updatedWorkPackage = await client.updateWorkPackage(params.work_package_id, updateData);

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
      result += `\n🔗 **View:** ${client.buildWorkPackageUrl(updatedWorkPackage.id)}`;

      console.log(`[OpenProjectAgent] Successfully updated assignments for work package #${params.work_package_id}`);
      return result;

    } catch (error) {
      console.error('[OpenProjectAgent] Error assigning user:', error);
      return `Error assigning user: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
}; 