import type { Tool, ToolParams } from '../../tools-registry';
import { OpenProjectApiClient } from '../api-client';

interface GetMetadataParams {
  include_statuses?: boolean;
  include_types?: boolean;
  include_priorities?: boolean;
}

export const getMetadataTool: Tool = {
  name: 'get_metadata',
  description: 'Get available statuses, types, and priorities from OpenProject for accurate filtering. Use this when you need to know the exact values for status, type, or priority filters.',
  parameters: {
    type: 'object',
    properties: {
      include_statuses: {
        type: 'boolean',
        description: 'Include available statuses (default: true)',
      },
      include_types: {
        type: 'boolean',
        description: 'Include available work package types (default: true)',
      },
      include_priorities: {
        type: 'boolean',
        description: 'Include available priorities (default: true)',
      },
    },
    required: [],
  },

  execute: async (args: ToolParams): Promise<string> => {
    const params = args as unknown as GetMetadataParams;
    const {
      include_statuses = true,
      include_types = true,
      include_priorities = true,
    } = params;
    
    try {
      const client = new OpenProjectApiClient();
      console.log('[OpenProjectAgent] Fetching OpenProject metadata...');
      
      let result = '**OpenProject Metadata**\n\n';

      // Get statuses
      if (include_statuses) {
        const statusesResponse = await client.listStatuses();
        const statuses = statusesResponse._embedded.elements;
        
        result += `**📋 Available Statuses (${statuses.length})**\n`;
        statuses.forEach((status, index) => {
          const closedIcon = status.isClosed ? ' 🔒' : '';
          const defaultIcon = status.isDefault ? ' ⭐' : '';
          result += `   ${index + 1}. **${status.name}**${closedIcon}${defaultIcon}\n`;
          result += `      • ID: ${status.id}\n`;
          result += `      • Closed: ${status.isClosed ? 'Yes' : 'No'}\n`;
          if (status.color) {
            result += `      • Color: ${status.color}\n`;
          }
        });
        result += '\n';
      }

      // Get types
      if (include_types) {
        const typesResponse = await client.listTypes();
        const types = typesResponse._embedded.elements;
        
        result += `**🔧 Available Types (${types.length})**\n`;
        types.forEach((type, index) => {
          const milestoneIcon = type.isMilestone ? ' 🏁' : '';
          const defaultIcon = type.isDefault ? ' ⭐' : '';
          result += `   ${index + 1}. **${type.name}**${milestoneIcon}${defaultIcon}\n`;
          result += `      • ID: ${type.id}\n`;
          result += `      • Milestone: ${type.isMilestone ? 'Yes' : 'No'}\n`;
          if (type.color) {
            result += `      • Color: ${type.color}\n`;
          }
        });
        result += '\n';
      }

      // Get priorities
      if (include_priorities) {
        const prioritiesResponse = await client.listPriorities();
        const priorities = prioritiesResponse._embedded.elements;
        
        result += `**⚡ Available Priorities (${priorities.length})**\n`;
        priorities.forEach((priority, index) => {
          const defaultIcon = priority.isDefault ? ' ⭐' : '';
          const activeIcon = priority.isActive ? '' : ' ❌';
          result += `   ${index + 1}. **${priority.name}**${defaultIcon}${activeIcon}\n`;
          result += `      • ID: ${priority.id}\n`;
          result += `      • Active: ${priority.isActive ? 'Yes' : 'No'}\n`;
          if (priority.color) {
            result += `      • Color: ${priority.color}\n`;
          }
        });
        result += '\n';
      }

      result += `💡 **Usage Tips:**\n`;
      result += `• Use the exact status names (e.g., "Closed", "In progress") in your filters\n`;
      result += `• Status names are case-sensitive\n`;
      result += `• 🔒 = Closed status, ⭐ = Default, 🏁 = Milestone, ❌ = Inactive\n`;
      result += `• You can filter by either name (e.g., "Closed") or ID (e.g., "14")\n`;

      console.log(`[OpenProjectAgent] Successfully retrieved metadata`);
      return result;

    } catch (error) {
      console.error('[OpenProjectAgent] Error getting metadata:', error);
      return `Error getting OpenProject metadata: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
}; 