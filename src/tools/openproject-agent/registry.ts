import type { ToolDefinition } from "../../services/ai/types";
import type { Tool, ToolParams, ToolResult } from "../tools-registry";
import { listProjectsTool } from "./tools/list-projects-tool";
import { createWorkPackageTool } from "./tools/create-work-package-tool";
import { listWorkPackagesTool } from "./tools/list-work-packages-tool";
import { assignUserTool } from "./tools/assign-user-tool";
import { searchUsersTool } from "./tools/search-users-tool";
import { getMetadataTool } from "./tools/get-metadata-tool";

/**
 * Registry for OpenProject agent's specialized tools
 */
export class OpenProjectToolsRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    // Register OpenProject-specific tools
    this.registerTool(listProjectsTool);
    this.registerTool(createWorkPackageTool);
    this.registerTool(listWorkPackagesTool);
    this.registerTool(assignUserTool);
    this.registerTool(searchUsersTool);
    this.registerTool(getMetadataTool);
  }

  /**
   * Register a new tool in the OpenProject registry
   * @param tool Tool implementation
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Execute a tool by name with provided arguments
   * @param name Name of the tool to execute
   * @param args Arguments to pass to the tool
   * @returns Result of the tool execution
   */
  async executeTool(name: string, args: ToolParams): Promise<ToolResult> {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new Error(`OpenProject tool not found: ${name}`);
    }

    return await tool.execute(args);
  }

  /**
   * Get tool definitions in OpenAI format
   * @returns Array of OpenAI SDK tool definitions
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool): ToolDefinition => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Get a list of all registered tool names
   * @returns Array of tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get count of registered tools
   * @returns Number of tools
   */
  getToolCount(): number {
    return this.tools.size;
  }
} 