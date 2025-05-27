import type { Tool, ToolParams } from '../../tools-registry';
import { OpenProjectApiClient } from '../api-client';
import type { WorkPackageFilters } from '../types';

interface ListWorkPackagesParams {
  project?: string | number;
  assignee?: string | number;
  responsible?: string | number;
  type?: string | number;
  status?: string | number;
  priority?: string | number;
  author?: string | number;
  subject?: string;
  description?: string;
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
  start_date_after?: string;
  start_date_before?: string;
  due_date_after?: string;
  due_date_before?: string;
  percentage_done?: string;
  limit?: number;
}

export const listWorkPackagesTool: Tool = {
  name: 'list_work_packages',
  description: 'List and filter work packages (issues) in OpenProject. Use "assignee" for tasks assigned to a user, "author" for tasks created by a user, "responsible" for tasks the user is accountable for.',
  parameters: {
    type: 'object',
    properties: {
      project: {
        type: ['string', 'number'],
        description: 'Filter by project ID or identifier',
      },
      assignee: {
        type: ['string', 'number'],
        description: 'Filter by assignee user ID or login name (user who is assigned to work on the task)',
      },
      responsible: {
        type: ['string', 'number'],
        description: 'Filter by responsible user ID or login name (user who is accountable for the task)',
      },
      type: {
        type: ['string', 'number'],
        description: 'Filter by work package type ID or name (e.g., Task, Bug, Feature)',
      },
      status: {
        type: ['string', 'number'],
        description: 'Filter by status ID or name (e.g., New, In Progress, Closed)',
      },
      priority: {
        type: ['string', 'number'],
        description: 'Filter by priority ID or name (e.g., Low, Normal, High, Immediate)',
      },
      author: {
        type: ['string', 'number'],
        description: 'Filter by author/creator user ID or login name (user who originally created the work package)',
      },
      subject: {
        type: 'string',
        description: 'Filter by subject/title containing this text',
      },
      description: {
        type: 'string',
        description: 'Filter by description containing this text',
      },
      created_after: {
        type: 'string',
        description: 'Filter work packages created after this date (YYYY-MM-DD format)',
      },
      created_before: {
        type: 'string',
        description: 'Filter work packages created before this date (YYYY-MM-DD format)',
      },
      updated_after: {
        type: 'string',
        description: 'Filter work packages updated after this date (YYYY-MM-DD format)',
      },
      updated_before: {
        type: 'string',
        description: 'Filter work packages updated before this date (YYYY-MM-DD format)',
      },
      start_date_after: {
        type: 'string',
        description: 'Filter work packages with start date after this date (YYYY-MM-DD format)',
      },
      start_date_before: {
        type: 'string',
        description: 'Filter work packages with start date before this date (YYYY-MM-DD format)',
      },
      due_date_after: {
        type: 'string',
        description: 'Filter work packages with due date after this date (YYYY-MM-DD format)',
      },
      due_date_before: {
        type: 'string',
        description: 'Filter work packages with due date before this date (YYYY-MM-DD format)',
      },
      percentage_done: {
        type: 'string',
        description: 'Filter by percentage done (e.g., "0", "50", "100" or ranges like "0..50")',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 20, max: 100)',
        minimum: 1,
        maximum: 100,
      },
    },
    required: [],
  },

  execute: async (args: ToolParams): Promise<string> => {
    const params = args as unknown as ListWorkPackagesParams;
    
    try {
      const client = new OpenProjectApiClient();
      console.log('[OpenProjectAgent] Fetching work packages with filters...');

      // Build filters object
      const filters: WorkPackageFilters = {};

      // Add filters based on parameters
      if (params.project !== undefined) {
        filters.project = String(params.project);
      }
      if (params.assignee !== undefined) {
        filters.assignee = String(params.assignee);
      }
      if (params.responsible !== undefined) {
        filters.responsible = String(params.responsible);
      }
      if (params.type !== undefined) {
        filters.type = String(params.type);
      }
      if (params.status !== undefined) {
        filters.status = String(params.status);
      }
      if (params.priority !== undefined) {
        filters.priority = String(params.priority);
      }
      if (params.author !== undefined) {
        filters.author = String(params.author);
      }
      if (params.subject) {
        filters.subject = params.subject;
      }
      if (params.description) {
        filters.description = params.description;
      }

      // Date filters - use proper OpenProject API v3 format
      if (params.created_after && params.created_before) {
        // Date range filter
        filters.createdAt = `<>d:${params.created_after}T00:00:00Z,${params.created_before}T23:59:59Z`;
      } else if (params.created_after) {
        filters.createdAt = `>=${params.created_after}T00:00:00Z`;
      } else if (params.created_before) {
        filters.createdAt = `<${params.created_before}T23:59:59Z`;
      }

      if (params.updated_after && params.updated_before) {
        // Date range filter
        filters.updatedAt = `<>d:${params.updated_after}T00:00:00Z,${params.updated_before}T23:59:59Z`;
      } else if (params.updated_after) {
        filters.updatedAt = `>=${params.updated_after}T00:00:00Z`;
      } else if (params.updated_before) {
        filters.updatedAt = `<${params.updated_before}T23:59:59Z`;
      }

      if (params.start_date_after && params.start_date_before) {
        // Date range filter
        filters.startDate = `<>d:${params.start_date_after},${params.start_date_before}`;
      } else if (params.start_date_after) {
        filters.startDate = `>=${params.start_date_after}`;
      } else if (params.start_date_before) {
        filters.startDate = `<${params.start_date_before}`;
      }

      if (params.due_date_after && params.due_date_before) {
        // Date range filter
        filters.dueDate = `<>d:${params.due_date_after},${params.due_date_before}`;
      } else if (params.due_date_after) {
        filters.dueDate = `>=${params.due_date_after}`;
      } else if (params.due_date_before) {
        filters.dueDate = `<${params.due_date_before}`;
      }

      if (params.percentage_done) {
        filters.percentageDone = params.percentage_done;
      }

      const response = await client.listWorkPackages(filters);
      const workPackages = response._embedded.elements;

      // Apply limit if specified
      const limit = params.limit || 20;
      const limitedWorkPackages = workPackages.slice(0, limit);

      if (workPackages.length === 0) {
        return 'No work packages found matching the specified filters.';
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
        
        result += `   • 🔗 **View:** ${client.buildWorkPackageUrl(wp.id)}\n\n`;
      });

      if (limitedWorkPackages.length < workPackages.length) {
        result += `\n*Use the limit parameter to see more results (max 100)*`;
      }

      console.log(`[OpenProjectAgent] Successfully retrieved ${workPackages.length} work packages`);
      return result;

    } catch (error) {
      console.error('[OpenProjectAgent] Error listing work packages:', error);
      return `Error listing work packages: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
}; 