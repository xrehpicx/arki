# Tool Call Persistence Improvements

## Problem Statement

Previously, Arki had a significant issue with tool call context loss. The bot would store conversation history by fetching Discord messages, but since tool calls and their results don't appear as regular Discord messages, this context was lost between interactions. This meant the AI would repeatedly call the same tools because it couldn't remember what it had already done.

## Solution Overview

We implemented a comprehensive tool call persistence system that stores tool calls in memory and reintegrates them into the conversation context when building AI message history.

## Architecture Changes

### 1. Enhanced ToolCallsStore

The `ToolCallsStore` singleton now properly manages tool call persistence:

- **Associative Storage**: Tool calls are stored using a composite key of message ID and timestamp
- **Memory Management**: Automatic cleanup of old tool calls when messages fall outside the history window
- **Retrieval System**: Efficient lookup by message ID or composite key

### 2. Improved Message Handling Flow

**src/events/message-handler.ts**:
- Tool calls are processed and stored entirely in memory (no Discord embeds)
- Tool calls are stored against the bot's response message (not the user's trigger)
- Better error handling and flow management

### 3. Context Reconstruction Logic

**src/utils/message-utils.ts**:
- `convertToAIMessages()` now properly reconstructs conversation context from memory
- Tool calls are retrieved from the ToolCallsStore and inserted at correct positions
- Tool calls are inserted in the correct order: tool_call → tool_results → assistant_response
- Better handling of empty bot messages and proper message ordering

### 4. Enhanced Utility Functions

- `sendSplitMessage()` now returns the sent message for tool call association
- Removed tool call embed functions since everything is handled in memory
- Simplified message conversion logic without embed handling

## Key Benefits

1. **Context Continuity**: Tool calls are preserved across conversations
2. **Reduced Redundancy**: AI doesn't repeat tool calls unnecessarily
3. **Invisible Tool Usage**: Tool calls happen seamlessly without user-visible embeds
4. **Memory Efficiency**: Automatic cleanup prevents memory leaks
5. **Correct Ordering**: Tool calls appear in proper sequence in AI context
6. **Robust Error Handling**: Graceful handling of API errors with user-friendly messages
7. **Token Management**: Configurable token limits to avoid credit issues

## Error Handling & Reliability Improvements

### Enhanced Error Management

The system now includes comprehensive error handling for common AI service issues:

- **Credit Limit Errors (402)**: Provides specific guidance about adding credits
- **Rate Limiting (429)**: Suggests waiting and retrying
- **Authentication Errors (401)**: Indicates configuration issues
- **Server Errors (5xx)**: Handles temporary service unavailability
- **Generic Errors**: Catches all other errors with meaningful messages

### Token Management

Added `MAX_TOKENS` configuration to prevent credit exhaustion:

- **Configurable Limit**: Set via `MAX_TOKENS` environment variable (default: 2048)
- **Credit Protection**: Prevents requesting more tokens than budget allows
- **Usage Logging**: Tracks token usage for monitoring and optimization

### Detailed Logging

Enhanced logging throughout the system for better debugging:

- **Request Preparation**: Logs message count, token limits, and model info
- **Message Processing**: Tracks message conversion and context building
- **Tool Execution**: Logs tool calls and their results
- **Response Handling**: Monitors AI responses and token usage
- **Error Context**: Provides detailed error information for troubleshooting

## Implementation Details

### Tool Call Storage Pattern

```typescript
// When tool calls occur:
1. Process tool calls and get results
2. Generate follow-up response with tool results  
3. Send final response to Discord
4. Store tool calls against the sent response message in memory
```

### Context Reconstruction Pattern

```typescript
// When building AI context:
1. Fetch Discord messages
2. Convert messages to AI format (skipping empty bot messages)
3. For each bot message, check for stored tool calls in memory
4. Insert tool calls BEFORE the bot response in correct order
5. Build complete conversation context
```

### Memory Management

- Tool calls are cleaned up when their associated messages fall outside the history window
- Uses message timestamps and IDs for efficient cleanup
- Singleton pattern ensures consistency across the application

## Configuration

The system works with both existing and new configuration options:

- `config.ai.messageHistoryLimit` controls both message and tool call retention
- `config.ai.maxTokens` limits token usage to prevent credit issues (default: 2048)
- Tool calls automatically inherit the same lifecycle as their associated messages

## Future Enhancements

1. **Persistent Storage**: Consider database storage for long-term context
2. **Tool Call Analytics**: Track tool usage patterns and efficiency
3. **Context Compression**: Optimize memory usage for long conversations
4. **Cross-Channel Context**: Share tool call context across channels
5. **Tool Call Caching**: Cache expensive tool results across sessions

## Testing

The `debug_history` command can be used to verify proper tool call integration in conversation context. It will show tool calls and results properly inserted into the AI message history.

## Documentation Updates

- **REQUIREMENTS.md**: Added tool call persistence section
- **RULES.md**: Added tool call handling guidelines
- **package.json**: Fixed build target for Node.js compatibility
- **env.sample**: Created with all required environment variables including MAX_TOKENS

This implementation solves the original context loss problem while maintaining a clean, maintainable architecture that can be easily extended in the future.