import type { Tool, ToolParams } from '../../tools-registry';
import { OpenProjectApiClient } from '../api-client';

interface ListProjectsParams {
  // No parameters needed for basic listing
}

export const listProjectsTool: Tool = {
  name: 'list_projects',
  description: 'List all available projects in OpenProject',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },

  execute: async (args: ToolParams): Promise<string> => {
    try {
      const client = new OpenProjectApiClient();
      console.log('[OpenProjectAgent] Fetching projects list...');
      
      const response = await client.listProjects();
      const projects = response._embedded.elements;

      if (projects.length === 0) {
        return 'No projects found in OpenProject.';
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
        result += `   • Updated: ${new Date(project.updatedAt).toLocaleDateString()}\n`;
        result += `   • 🔗 **View:** ${client.buildProjectUrl(project.id)}\n\n`;
      });

      console.log(`[OpenProjectAgent] Successfully retrieved ${projects.length} projects`);
      return result;

    } catch (error) {
      console.error('[OpenProjectAgent] Error listing projects:', error);
      return `Error listing projects: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
}; 