import type OpenAI from "openai";

/**
 * OpenAI API service configuration (application-specific)
 */
export interface AIServiceConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
  systemPrompt: string;
  maxTokens?: number;
  customTools?: ToolDefinition[]; // Allow custom tool definitions for specialized agents
}

/**
 * Re-export OpenAI SDK types for multimodal content
 * These are the actual types from OpenAI SDK, not custom duplicates
 */
export type MessageContentPart = 
  | OpenAI.Chat.Completions.ChatCompletionContentPartText
  | OpenAI.Chat.Completions.ChatCompletionContentPartImage
  | OpenAI.Chat.Completions.ChatCompletionContentPartInputAudio;

// Re-export specific content part types for convenience
export type TextContentPart = OpenAI.Chat.Completions.ChatCompletionContentPartText;
export type ImageContentPart = OpenAI.Chat.Completions.ChatCompletionContentPartImage;
export type AudioContentPart = OpenAI.Chat.Completions.ChatCompletionContentPartInputAudio;

/**
 * Re-export OpenAI SDK message types
 * These are the actual OpenAI message parameter types, not custom duplicates
 */
export type AIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Re-export OpenAI SDK tool call types
 * These are the actual OpenAI tool call types, not custom duplicates
 */
export type ToolCall = OpenAI.Chat.Completions.ChatCompletionMessageToolCall;

/**
 * Re-export OpenAI SDK tool definition type
 * This is the actual OpenAI tool definition type, not a custom duplicate
 */
export type ToolDefinition = OpenAI.Chat.Completions.ChatCompletionTool;

/**
 * Response format from AI service (application-specific wrapper)
 */
export interface AIResponse {
  message: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam;
  tool_calls?: ToolCall[];
}

/**
 * Tool result format (application-specific)
 * This represents our internal tool execution result format
 */
export interface ToolResult {
  tool_call_id: string;
  role: 'tool';
  name: string;
  content: string;
}

/**
 * Stored tool call data (application-specific)
 * This is our internal storage format for tool call context
 */
export interface ToolCallData {
  messageId: string;
  messageContent: string;
  timestamp: number;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
} 