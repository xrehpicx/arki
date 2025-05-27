import { Message } from 'discord.js';
import type { ToolCall, ToolResult, ToolCallData as AIToolCallData } from './types';

/**
 * Interface for storing tool call data
 */
interface ToolCallData {
  messageId: string;
  messageContent: string;
  timestamp: number;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
}

/**
 * Service for storing and retrieving tool calls associated with Discord messages
 */
export class ToolCallsStore {
  private static instance: ToolCallsStore;
  private toolCallsMap: Map<string, ToolCallData> = new Map();
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ToolCallsStore {
    if (!this.instance) {
      this.instance = new ToolCallsStore();
    }
    return this.instance;
  }
  
  /**
   * Store tool calls and their results
   */
  public storeToolCallsForMessage(
    message: Message,
    toolCalls: ToolCall[],
    toolResults: ToolResult[]
  ): void {
    const key = this.generateMessageKey(message);
    console.log(`[ToolCallsStore] Saving tool calls for message ${message.id} at ${message.createdTimestamp}`);
    this.toolCallsMap.set(key, {
      messageId: message.id,
      messageContent: message.content,
      timestamp: message.createdTimestamp,
      toolCalls,
      toolResults
    });
  }
  
  /**
   * Get stored tool calls and results for a message
   */
  public getToolCallsForMessage(message: Message): ToolCallData | undefined {
    const key = this.generateMessageKey(message);
    const data = this.toolCallsMap.get(key);
    if (data) {
      console.log(`[ToolCallsStore] Reusing tool calls for message ${message.id} at ${message.createdTimestamp}`);
    }
    return data;
  }
  
  /**
   * Get stored tool calls by message ID
   */
  public getToolCallsByMessageId(messageId: string): ToolCallData | undefined {
    for (const [key, data] of this.toolCallsMap.entries()) {
      if (data.messageId === messageId) {
        return data;
      }
    }
    return undefined;
  }
  
  /**
   * Clean up old tool calls based on message history
   */
  public cleanupOldToolCalls(recentMessages: Message[]): void {
    // Create a set of keys for recent messages
    const recentMessageKeys = new Set(
      recentMessages.map(msg => this.generateMessageKey(msg))
    );
    
    // Create a set of recent message IDs
    const recentMessageIds = new Set(
      recentMessages.map(msg => msg.id)
    );
    
    // Remove entries that are no longer in recent messages
    for (const key of this.toolCallsMap.keys()) {
      const data = this.toolCallsMap.get(key);
      if (!recentMessageKeys.has(key) && !recentMessageIds.has(data?.messageId || '')) {
        if (data) {
          console.log(`[ToolCallsStore] Removing tool calls for message ${data.messageId} at ${data.timestamp} from memory`);
        }
        this.toolCallsMap.delete(key);
      }
    }
  }
  
  /**
   * Generate a unique key for a message
   */
  private generateMessageKey(message: Message): string {
    return `${message.id}_${message.createdTimestamp}`;
  }
} 