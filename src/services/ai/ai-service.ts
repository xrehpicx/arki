import OpenAI from "openai";
import type {
  AIResponse,
  AIServiceConfig,
  AIMessage,
  ToolCall, 
  ToolResult,
  ToolDefinition
} from "./types";
import { toolsRegistry } from "../../tools/tools-registry";

export class AIService {
  private client: OpenAI;
  private modelName: string;
  private systemPrompt: string;
  private tools: ToolDefinition[]; // Now using OpenAI SDK type directly
  private maxTokens: number;

  constructor(options: AIServiceConfig) {
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
    });

    this.modelName = options.modelName;
    this.systemPrompt = options.systemPrompt;
    this.maxTokens = options.maxTokens || 8192; // High default, let Discord truncate
    
    console.log(`[AIService] Initialized with model: ${this.modelName}, maxTokens: ${this.maxTokens}`);
    
    // Use custom tools if provided, otherwise use global registry
    this.tools = options.customTools || toolsRegistry.getToolDefinitions();
    
    console.log(`[AIService] Loaded ${this.tools.length} tools: ${this.tools.map(t => t.function.name).join(', ')}`);
  }

  /**
   * Generate a response using the configured AI model
   * @param messages Chat history messages (using OpenAI SDK types)
   * @returns AI response
   */
  async generateResponse(messages: AIMessage[]): Promise<AIResponse> {
    try {
      // Add system prompt as first message if not already present
      const systemMessage: AIMessage = {
        role: "system",
        content: this.systemPrompt,
      };
      const allMessages: AIMessage[] =
        messages[0]?.role === "system"
          ? messages
          : [systemMessage, ...messages];

      console.log(`[AIService] Preparing request with ${allMessages.length} messages, maxTokens: ${this.maxTokens}`);
      console.log(`[AIService] Model: ${this.modelName}, Tools available: ${this.tools.length > 0 ? 'Yes' : 'No'}`);

      // Log message summary for debugging
      const messageSummary = allMessages.map((msg, i) => ({
        index: i,
        role: msg.role,
        contentLength: typeof msg.content === 'string' ? msg.content.length : Array.isArray(msg.content) ? msg.content.length : 0,
        hasToolCalls: 'tool_calls' in msg && msg.tool_calls ? msg.tool_calls.length : 0
      }));
      console.log(`[AIService] Message summary:`, messageSummary);

      // Detailed logging for multimodal debugging
      allMessages.forEach((msg, index) => {
        if (Array.isArray(msg.content)) {
          console.log(`[AIService] Message ${index} (${msg.role}) multimodal content:`);
          msg.content.forEach((part: any, partIndex: number) => {
            if (part.type === 'image_url') {
              console.log(`  Part ${partIndex}: IMAGE - ${part.image_url.url} (detail: ${part.image_url.detail})`);
            } else if (part.type === 'text') {
              console.log(`  Part ${partIndex}: TEXT - "${part.text.substring(0, 100)}${part.text.length > 100 ? '...' : ''}"`);
            } else {
              console.log(`  Part ${partIndex}: ${part.type} - ${JSON.stringify(part).substring(0, 100)}`);
            }
          });
        } else if (typeof msg.content === 'string') {
          console.log(`[AIService] Message ${index} (${msg.role}) text content: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"`);
        }
      });

      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: allMessages, // No conversion needed - already using OpenAI types
        tools: this.tools.length > 0 ? this.tools : undefined,
        max_tokens: this.maxTokens,
      });

      console.log(`[AIService] Received response from AI. Usage:`, response.usage);

      const completion = response.choices[0];

      if (!completion) {
        throw new Error("No completion received from AI");
      }

      const message = completion.message;
      console.log(`[AIService] Response content length: ${message.content?.length || 0}, Tool calls: ${message.tool_calls?.length || 0}`);
      console.log(`[AIService] Response content preview: "${message.content?.substring(0, 200)}${(message.content?.length || 0) > 200 ? '...' : ''}"`);

      return {
        message, // Already in the correct format
        tool_calls: message.tool_calls, // Already in the correct format
      };
    } catch (error: any) {
      console.error("[AIService] Error generating AI response:", error);
      
      // Handle specific OpenRouter/OpenAI errors
      if (error?.status === 402) {
        const errorMessage = `Insufficient credits. You requested up to ${this.maxTokens} tokens but can only afford ${error.error?.metadata?.remaining_credits || 'unknown'} tokens. Please add more credits at https://openrouter.ai/settings/credits`;
        console.error(`[AIService] Credit limit error: ${errorMessage}`);
        throw new Error(`AI service credit limit exceeded: ${errorMessage}`);
      } else if (error?.status === 429) {
        console.error("[AIService] Rate limit exceeded");
        throw new Error("AI service rate limit exceeded. Please try again later.");
      } else if (error?.status === 401) {
        console.error("[AIService] Authentication failed");
        throw new Error("AI service authentication failed. Please check your API key.");
      } else if (error?.status >= 500) {
        console.error("[AIService] Server error");
        throw new Error("AI service is temporarily unavailable. Please try again later.");
      } else {
        // Generic error handling
        const errorMsg = error?.message || error?.toString() || "Unknown error";
        console.error(`[AIService] Unexpected error: ${errorMsg}`);
        throw new Error(`AI service error: ${errorMsg}`);
      }
    }
  }

  /**
   * Process tool calls from the AI response
   * @param toolCalls The tool calls to process
   * @returns Array of tool results
   */
  async processToolCalls(
    toolCalls: ToolCall[] | undefined
  ): Promise<ToolResult[]> {
    if (!toolCalls || toolCalls.length === 0) {
      return [];
    }

    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      if (call.type !== "function") continue;

      const { name, arguments: argsString } = call.function;
      console.log(`[AIService] Executing tool: ${name} with arguments: ${argsString}`);

      try {
        const args = JSON.parse(argsString);
        const result = await toolsRegistry.executeTool(name, args);
        const resultString = typeof result === "string" ? result : JSON.stringify(result);

        console.log(`[AIService] Tool '${name}' executed successfully. Result: ${resultString}`);
        results.push({
          tool_call_id: call.id,
          role: "tool",
          name,
          content: resultString,
        });
      } catch (error) {
        console.error(`[AIService] Error executing tool ${name}:`, error);
        results.push({
          tool_call_id: call.id,
          role: "tool",
          name,
          content: `Error: Failed to execute tool ${name}`,
        });
      }
    }

    return results;
  }

  /**
   * Create tool result messages for the AI
   * @param toolResults The results from tool executions
   * @returns Messages to feed back to the AI (using OpenAI SDK types)
   */
  createToolResultMessages(
    toolResults: ToolResult[]
  ): AIMessage[] {
    if (toolResults.length === 0) {
      return [];
    }

    return toolResults.map((result): AIMessage => ({
      role: "tool",
      content: result.content,
      tool_call_id: result.tool_call_id,
    }));
  }
}
