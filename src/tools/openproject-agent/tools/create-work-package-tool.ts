import type { Tool, ToolParams } from '../../tools-registry';
import { OpenProjectApiClient } from '../api-client';
import type { CreateWorkPackageRequest } from '../types';

interface CreateWorkPackageParams {
  project_id: number;
  subject: string;
  description?: string;
  type_id?: number;
  status_id?: number;
  priority_id?: number;
  assignee_id?: number;
  responsible_id?: number;
  start_date?: string;
  due_date?: string;
  estimated_time?: string;
  percentage_done?: number;
}

export const createWorkPackageTool: Tool = {
  name: 'create_work_package',
  description: 'Create a new work package (issue) in OpenProject',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'number',
        description: 'ID of the project to create the work package in',
      },
      subject: {
        type: 'string',
        description: 'Title/subject of the work package',
      },
      description: {
        type: 'string',
        description: 'Detailed description of the work package (supports markdown)',
      },
      type_id: {
        type: 'number',
        description: 'ID of the work package type (e.g., Task, Bug, Feature). If not provided, default type will be used.',
      },
      status_id: {
        type: 'number',
        description: 'ID of the initial status. If not provided, default status will be used.',
      },
      priority_id: {
        type: 'number',
        description: 'ID of the priority level. If not provided, default priority will be used.',
      },
      assignee_id: {
        type: 'number',
        description: 'ID of the user to assign the work package to',
      },
      responsible_id: {
        type: 'number',
        description: 'ID of the user who is responsible for the work package',
      },
      start_date: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format',
      },
      due_date: {
        type: 'string',
        description: 'Due date in YYYY-MM-DD format',
      },
      estimated_time: {
        type: 'string',
        description: 'Estimated time (e.g., "8h", "2d")',
      },
      percentage_done: {
        type: 'number',
        description: 'Percentage completion (0-100)',
        minimum: 0,
        maximum: 100,
      },
    },
    required: ['project_id', 'subject'],
  },

  execute: async (args: ToolParams): Promise<string> => {
    const params = args as unknown as CreateWorkPackageParams;
    
    try {
      const client = new OpenProjectApiClient();
      console.log(`[OpenProjectAgent] Creating work package: "${params.subject}"`);

      // Build the create request
      const createData: CreateWorkPackageRequest = {
        subject: params.subject,
        _links: {
          project: { href: client.buildProjectHref(params.project_id) },
          type: { href: client.buildTypeHref(params.type_id || 1) }, // Default to type 1 if not specified
        },
      };

      // Add optional description
      if (params.description) {
        createData.description = {
          format: 'markdown',
          raw: params.description,
        };
      }

      // Add optional links
      if (params.status_id) {
        createData._links.status = { href: client.buildStatusHref(params.status_id) };
      }
      if (params.priority_id) {
        createData._links.priority = { href: client.buildPriorityHref(params.priority_id) };
      }
      if (params.assignee_id) {
        createData._links.assignee = { href: client.buildUserHref(params.assignee_id) };
      }
      if (params.responsible_id) {
        createData._links.responsible = { href: client.buildUserHref(params.responsible_id) };
      }

      // Add optional dates and time
      if (params.start_date) {
        createData.startDate = params.start_date;
      }
      if (params.due_date) {
        createData.dueDate = params.due_date;
      }
      if (params.estimated_time) {
        createData.estimatedTime = params.estimated_time;
      }
      if (params.percentage_done !== undefined) {
        createData.percentageDone = params.percentage_done;
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

      result += `\n🔗 **View:** ${client.buildWorkPackageUrl(workPackage.id)}`;

      console.log(`[OpenProjectAgent] Successfully created work package #${workPackage.id}`);
      return result;

    } catch (error) {
      console.error('[OpenProjectAgent] Error creating work package:', error);
      return `Error creating work package: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
}; 