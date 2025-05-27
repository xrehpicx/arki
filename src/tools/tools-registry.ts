import type { ToolDefinition } from "../services/ai/types";
import { dateTimeTool } from "./date-time-tool";
import { openProjectAgentTool } from "./openproject-agent/index";

/**
 * Base interface for tool parameters
 */
export interface ToolParams {
  [key: string]: string | number | boolean | null | ToolParams | Array<string | number | boolean | null | ToolParams>;
}

/**
 * Type for tool execution results
 */
export type ToolResult = string | number | boolean | null | Record<string, unknown> | Array<unknown>;

/**
 * Interface for tool implementation
 * This is our internal tool interface, separate from OpenAI's format
 */
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema format
  execute: (args: ToolParams) => Promise<ToolResult> | ToolResult;
}

/**
 * Registry for managing available tools
 */
class ToolsRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    // Register built-in tools
    this.registerTool(dateTimeTool);
    this.registerTool(openProjectAgentTool);
  }

  /**
   * Register a new tool in the registry
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
      throw new Error(`Tool not found: ${name}`);
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
}

// Create singleton instance
export const toolsRegistry = new ToolsRegistry();
