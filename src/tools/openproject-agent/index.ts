import type { Tool, ToolParams } from '../tools-registry';
import { AIService } from '../../services/ai/ai-service';
import type { AIMessage } from '../../services/ai/types';
import { OpenProjectToolsRegistry } from './registry';
import { config } from '../../config/config';

interface OpenProjectAgentOptions {
  task: string;
  context?: string;
  max_iterations?: number;
}

/**
 * OpenProject Agent - A specialized AI agent for OpenProject management
 * This agent has its own AI service instance and OpenProject-focused toolset
 */
export const openProjectAgentTool: Tool = {
  name: 'openproject_agent',
  description: 'A specialized AI agent for ALL OpenProject management tasks including: listing/searching work packages, finding users, creating tasks, managing assignments, and project operations. Use this for ANY request involving OpenProject, issues, work packages, tasks, bugs, projects, or user management.',
  parameters: {
    type: 'object',
    properties: {
      task: {
        type: 'string',
        description: 'The OpenProject management task you want the agent to perform',
      },
      context: {
        type: 'string',
        description: 'Additional context or requirements for the OpenProject task',
      },
      max_iterations: {
        type: 'number',
        description: 'Maximum number of tool iterations the agent can perform (default: 5)',
        minimum: 1,
        maximum: 8,
      },
    },
    required: ['task'],
  },
  
  execute: async (args: ToolParams): Promise<string> => {
    const options = args as unknown as OpenProjectAgentOptions;
    const { task, context, max_iterations = 5 } = options;
    
    try {
      // Create a specialized OpenProject tools registry
      const openProjectRegistry = new OpenProjectToolsRegistry();
      
      console.log(`[OpenProjectAgent] Starting OpenProject task: "${task}"`);
      console.log(`[OpenProjectAgent] Available tools: ${openProjectRegistry.getToolNames().join(', ')}`);
      
      // Create a specialized AI service instance with OpenProject tools
      const openProjectSystemPrompt = `You are an OpenProject Agent, a specialized AI assistant focused on OpenProject management tasks.

Your capabilities include:
- Searching and managing users (find user IDs from names/emails)
- Listing and managing projects
- Creating, updating, and managing work packages (issues/tasks)
- Advanced filtering and searching of work packages
- Assigning users to work packages and managing responsibilities
- Comprehensive project workflow management

Your goal is to help with the OpenProject task: "${task}"

${context ? `Additional context: ${context}` : ''}

OpenProject Instance: ${config.openProject.baseUrl}

IMPORTANT WORKFLOW GUIDELINES:
1. **Action-Oriented**: DO NOT explain what you're going to do - just do it. Execute tools immediately without lengthy explanations.

2. **Multi-step Tasks**: Complete the full workflow in one go. Use multiple tools in sequence without stopping to explain.

3. **User ID Resolution**: When given user names or emails (not IDs):
   - Use \`search_users\` to find the user ID, then immediately use \`list_work_packages\` with appropriate filters
   - **IMPORTANT**: "Issues by [user]" queries should check BOTH author AND assignee to get comprehensive results
   - Example: "Issues by raj" → search_users("raj") → list_work_packages(assignee=user_id) to get all issues assigned to the user
   - For "authored by" specifically: use \`author\` filter for issues created by the user
   - For "assigned to" specifically: use \`assignee\` filter for issues assigned to the user
   - For general "by" queries: default to \`assignee\` filter (more common use case)

4. **Status/Type/Priority Resolution**: When filtering by status/type/priority and unsure of exact names:
   - Use \`get_metadata\` to get exact values, then immediately use \`list_work_packages\` with correct filters
   - **IMPORTANT**: If status name fails with "invalid values" error, try using the status ID instead
   - Example: "done issues" → get_metadata() → identify "Closed" status (ID: 14) → list_work_packages(status="Closed") → if fails, try list_work_packages(status="14")

5. **Comprehensive Filtering**: Use \`list_work_packages\` with appropriate filters:
   - project, assignee, responsible, type, status, priority, author
   - subject, description (text search)  
   - Date ranges: created_after/before, updated_after/before, start_date_after/before, due_date_after/before
   - percentage_done ranges

6. **Complete Results**: Always provide:
   - Full work package details (ID, subject, status, assignee, dates, etc.)
   - **CRITICAL**: Always include clickable links to view items in OpenProject (work packages, projects, users)
   - Summary counts and relevant context
   - User-friendly formatting with clear sections

7. **Tool Sequence Examples**:
   - "List issues by John" → search_users("John") → list_work_packages(assignee=user_id) → show results
   - "Done issues by Anju" → search_users("Anju") → get_metadata() → list_work_packages(assignee=user_id, status="Closed") → show results
   - "Issues authored by John" → search_users("John") → list_work_packages(author=user_id) → show results
   - "Assign task to Sarah" → search_users("Sarah") → assign_user(user_id) → show results
   - "Create task for Mike" → search_users("Mike") → create_work_package(assignee_id=user_id) → show results

8. **Smart User Matching**: When search_users returns multiple matches:
   - **Priority Logic**: Prioritize users based on exact name matches:
     1. **First Priority**: Exact first name match (e.g., "raj" query → "raj sharma" wins over "Neeraj H N")
     2. **Second Priority**: Exact last name match
     3. **Third Priority**: Full name contains the search term
   - **Auto-Select**: If there's a clear first name match, automatically use that user WITHOUT asking for clarification
   - **Use the Best Match**: When search_users shows a "🎯 Best Match" result, immediately use that user ID
   - **Clarification**: Only ask for clarification if there are multiple equally valid matches (no clear best match)
   - **Example**: For "raj" → automatically choose "raj sharma" (User ID: 8) over "Neeraj H N" or "Rajani Kalyani K S"

9. **Error Handling**: Handle API errors gracefully and provide meaningful error messages. If a tool fails, try alternative approaches.

Be thorough and complete multi-step workflows. You have ${max_iterations} tool iterations - use them effectively to provide comprehensive results, not just partial information. EXECUTE TOOLS IMMEDIATELY WITHOUT EXPLAINING - users want results, not explanations of what you're going to do.

**CRITICAL**: When providing final responses, always include the actual detailed data you found through your tools. Never just say "task completed" - show the work packages, user details, project information, etc. that you discovered. Users need to see the actual results, not just confirmation that you found them.

**LINKS REQUIREMENT**: Every OpenProject result MUST include clickable links - work packages, projects, and users should all have their respective view/profile links included in the response.`;

      const openProjectAI = new AIService({
        apiKey: config.ai.apiKey,
        baseUrl: config.ai.baseUrl,
        modelName: config.ai.modelName,
        systemPrompt: openProjectSystemPrompt,
        customTools: openProjectRegistry.getToolDefinitions(), // Use OpenProject-specific tools only
      });

      // Prepare the initial message
      const messages: AIMessage[] = [
        {
          role: 'user',
          content: `Please help me with this OpenProject task: ${task}${context ? `\n\nContext: ${context}` : ''}`
        }
      ];

      let iterationCount = 0;
      let finalResponse = '';
      let foundUserIdButNeedsList = false;

      // OpenProject task iteration loop
      while (iterationCount < max_iterations || (foundUserIdButNeedsList && iterationCount < max_iterations + 2)) {
        iterationCount++;
        const effectiveMax = foundUserIdButNeedsList ? max_iterations + 2 : max_iterations;
        console.log(`[OpenProjectAgent] Iteration ${iterationCount}/${effectiveMax}`);

        // Get AI response
        const response = await openProjectAI.generateResponse(messages);
        
        // Check if the AI wants to use tools
        if (response.tool_calls && response.tool_calls.length > 0) {
          console.log(`[OpenProjectAgent] AI wants to use ${response.tool_calls.length} tools`);
          
          // Add the assistant message with tool calls
          messages.push({
            role: 'assistant',
            content: response.message.content,
            tool_calls: response.tool_calls
          });

          // Process tool calls using the OpenProject registry
          const toolResults = [];
          for (const toolCall of response.tool_calls) {
            if (toolCall.type !== 'function') continue;

            const { name, arguments: argsString } = toolCall.function;
            console.log(`[OpenProjectAgent] Executing OpenProject tool: ${name}`);

            try {
              const toolArgs = JSON.parse(argsString);
              const result = await openProjectRegistry.executeTool(name, toolArgs);
              const resultString = typeof result === 'string' ? result : JSON.stringify(result);

              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                content: resultString,
              });

              console.log(`[OpenProjectAgent] Tool '${name}' completed successfully`);
            } catch (error) {
              console.error(`[OpenProjectAgent] Error executing tool ${name}:`, error);
              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                content: `Error: Failed to execute ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              });
            }
          }

          // Check if we found a user ID and need to list work packages
          for (const toolCall of response.tool_calls) {
            if (toolCall.function?.name === 'search_users') {
              const toolResult = toolResults.find(r => r.tool_call_id === toolCall.id);
              if (toolResult?.content?.includes('User ID:') && 
                  (task.toLowerCase().includes('list') || task.toLowerCase().includes('issue') || task.toLowerCase().includes('work package'))) {
                foundUserIdButNeedsList = true;
                console.log(`[OpenProjectAgent] Found user ID, extending iterations to complete work package listing`);
              }
            }
          }

          // Add tool results to conversation
          messages.push(...toolResults);

          // If this is the last normal iteration, ask for final summary with actual data
          if (iterationCount === max_iterations && !foundUserIdButNeedsList) {
            messages.push({
              role: 'user',
              content: 'Please provide a comprehensive final summary of your OpenProject management results. Include ALL the detailed information you found - work package IDs, titles, statuses, users, dates, links, etc. Do not just say the task was completed, show the actual data and results you discovered.'
            });
          } else if (iterationCount === max_iterations + 2) {
            // If we've extended iterations and still haven't finished, force summary
            messages.push({
              role: 'user',
              content: 'Please provide a comprehensive final summary of your OpenProject management results. Include ALL the detailed information you found - work package IDs, titles, statuses, users, dates, links, etc. Do not just say the task was completed, show the actual data and results you discovered.'
            });
          }
        } else {
          // No more tools needed, this is the final response
          const content = response.message.content;
          finalResponse = typeof content === 'string' ? content : 'OpenProject task completed with no specific results.';
          break;
        }
      }

      // If we used all iterations and haven't gotten a final response, get one
      if (!finalResponse && iterationCount >= max_iterations) {
        console.log(`[OpenProjectAgent] Maximum iterations reached, getting final response`);
        const finalResponseResult = await openProjectAI.generateResponse(messages);
        const content = finalResponseResult.message.content;
        finalResponse = typeof content === 'string' ? content : 'OpenProject task completed after maximum iterations.';
      }

      console.log(`[OpenProjectAgent] OpenProject task completed after ${iterationCount} iterations`);
      
      return `**OpenProject Agent Results**\n\n${finalResponse}\n\n---\n*Task completed using ${openProjectRegistry.getToolCount()} specialized OpenProject tools in ${iterationCount} iterations*`;

    } catch (error) {
      console.error('[OpenProjectAgent] Error during OpenProject task:', error);
      return `OpenProject Agent encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
}; 