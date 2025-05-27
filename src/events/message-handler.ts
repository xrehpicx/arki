import { Client, Message, TextChannel } from "discord.js";
import { config } from "../config/config";
import { AIService } from "../services/ai/ai-service";
import { ToolCallsStore } from "../services/ai/tool-calls-store";
import { isUserAllowed, isBotMentioned } from "../utils/permissions";
import {
  fetchRecentMessages,
  convertToAIMessages,
  extractQueryFromMention,
  sendSplitMessage,
} from "../utils/message-utils";
import { generateSystemPrompt } from "../utils/prompt-utils";

/**
 * Typing indicator manager for continuous typing during long operations
 */
class TypingManager {
  private channel: TextChannel;
  private interval: NodeJS.Timeout | null = null;
  private isActive = false;

  constructor(channel: TextChannel) {
    this.channel = channel;
  }

  /**
   * Start continuous typing indicator
   */
  start(): void {
    if (this.isActive) return;

    this.isActive = true;

    // Send initial typing
    this.channel.sendTyping().catch(console.error);

    // Set up interval to refresh typing every 9 seconds (before Discord's 10s timeout)
    this.interval = setInterval(() => {
      if (this.isActive) {
        this.channel.sendTyping().catch(console.error);
      }
    }, 9000);

    console.log("[TypingManager] Started continuous typing indicator");
  }

  /**
   * Stop continuous typing indicator
   */
  stop(): void {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    console.log("[TypingManager] Stopped continuous typing indicator");
  }

  /**
   * Check if typing is active
   */
  get active(): boolean {
    return this.isActive;
  }
}

/**
 * Main message handler - responds to @mentions
 */
export async function handleMessage(
  message: Message,
  client: Client
): Promise<void> {
  // Early returns for invalid cases
  if (message.author.bot) return;
  if (!(message.channel instanceof TextChannel)) return;
  if (!client.user?.id) return;
  if (!isBotMentioned(message, client.user.id)) return;
  if (!isUserAllowed(message)) {
    await message.reply("You do not have permission to use this bot.");
    return;
  }

  console.log(`Processing message from ${message.author.username}`);

  // Create typing manager for this channel
  const typingManager = new TypingManager(message.channel);

  try {
    // Start continuous typing indicator
    typingManager.start();

    // Get AI response
    const response = await processUserMessage(message, client.user.id);

    // Send response to Discord
    await sendResponse(message, response);
  } catch (error) {
    console.error("Error processing message:", error);
    await sendSplitMessage(message.channel, getErrorMessage(error), message);
  } finally {
    // Always stop typing indicator
    typingManager.stop();
  }
}

/**
 * Process user message and get AI response
 */
async function processUserMessage(message: Message, clientId: string) {
  // Setup AI service with enhanced prompt for OpenProject delegation
  const basePrompt = `You are Arki, a helpful AI assistant integrated into a Discord server.

**🛠️ SPECIALIZED AGENTS AVAILABLE:**

**OpenProject Agent** - Use this for ANY OpenProject-related requests:
- When users ask about "issues," "work packages," "tasks," "bugs," or "projects" 
- When users mention "OpenProject" explicitly
- For project management tasks like creating, listing, assigning, or updating work items
- For user management in OpenProject (finding users, assignments)
- For any workflow involving work packages, projects, or team assignments

**IMPORTANT**: When you detect an OpenProject-related request, ALWAYS use the 'openproject_agent' tool. Examples:
- "show me issues by raj" → openproject_agent
- "list work packages" → openproject_agent  
- "create a task" → openproject_agent
- "assign issue to user" → openproject_agent
- "find user in OpenProject" → openproject_agent

**Other capabilities:**
- General conversation and questions
- Image analysis and multimodal content
- Date/time information
- General assistance

When in doubt about OpenProject requests, use the OpenProject agent - it's designed to handle all project management workflows.`;

  const systemPrompt = generateSystemPrompt(basePrompt, {
    guild: message.guild || undefined,
    channel: message.channel,
    message,
  });

  const aiService = new AIService({
    apiKey: config.ai.apiKey,
    baseUrl: config.ai.baseUrl,
    modelName: config.ai.modelName,
    systemPrompt,
  });

  // Get message history and convert to AI format
  const recentMessages = await fetchRecentMessages(
    message.channel as TextChannel,
    config.ai.messageHistoryLimit
  );

  // Clean up old tool calls
  ToolCallsStore.getInstance().cleanupOldToolCalls(recentMessages);

  // Convert to AI format
  const query = extractQueryFromMention(message.content, clientId);
  const aiMessages = await convertToAIMessages(recentMessages, query);

  // Get AI response
  const response = await aiService.generateResponse(aiMessages);

  // Handle tool calls if present
  if (response.tool_calls && response.tool_calls.length > 0) {
    return await handleToolCalls(aiService, aiMessages, response);
  }

  return (
    response.message.content || "I processed your request but have no response."
  );
}

/**
 * Handle tool calls and get follow-up response
 */
async function handleToolCalls(
  aiService: AIService,
  aiMessages: any[],
  response: any
) {
  const toolResults = await aiService.processToolCalls(response.tool_calls);
  const toolMessages = aiService.createToolResultMessages(toolResults);

  const followUpResponse = await aiService.generateResponse([
    ...aiMessages,
    response.message,
    ...toolMessages,
  ]);

  return {
    content:
      followUpResponse.message.content ||
      "I processed your request but have no response.",
    toolCalls: response.tool_calls,
    toolResults,
  };
}

/**
 * Send response to Discord and store tool calls if present
 */
async function sendResponse(message: Message, response: any) {
  const content = typeof response === "string" ? response : response.content;

  const sentMessage = await sendSplitMessage(
    message.channel as TextChannel,
    content,
    message
  );

  // Store tool calls if present
  if (sentMessage && response.toolCalls && response.toolResults) {
    ToolCallsStore.getInstance().storeToolCallsForMessage(
      sentMessage,
      response.toolCalls,
      response.toolResults
    );
  }
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: any): string {
  const errorMessage = error.message?.toLowerCase() || "";

  if (errorMessage.includes("credit limit exceeded")) {
    return "Sorry, I'm currently experiencing credit limitations. Please try again later.";
  }
  if (errorMessage.includes("rate limit exceeded")) {
    return "Sorry, I'm being rate limited. Please wait a moment and try again.";
  }
  if (errorMessage.includes("authentication failed")) {
    return "Sorry, there's a configuration issue with my AI service. Please contact the administrator.";
  }
  if (errorMessage.includes("temporarily unavailable")) {
    return "Sorry, the AI service is temporarily unavailable. Please try again later.";
  }

  return "Sorry, I encountered an error while processing your request.";
}
