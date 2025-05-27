# Arki - Discord Bot Requirements

## Overview
Arki is a Discord bot built with Discord.js and Bun.js in TypeScript that leverages AI capabilities through OpenRouter to interact with users in Discord servers.

## Core Requirements

### Technical Stack
- **Runtime Environment**: Bun.js
- **Package Manager**: Bun.js
- **Language**: TypeScript
- **Main Libraries**: 
  - discord.js for Discord integration
  - OpenAI SDK for AI capabilities, connected to OpenRouter

### Discord Bot Functionality
- Bot listens for messages on any channel of the server it's a part of
- Bot only replies when directly mentioned (@Arki)
- When triggered by a mention, the bot fetches the last n messages from the channel

### Permission System
- Access control based on:
  - Explicit user IDs
  - Role names
- Permissions configured per guild ID

### AI Integration
- Uses an abstraction on top of the OpenAI SDK
- Base URL configured to use OpenRouter
- Model name is configurable
- Message history is converted to OpenAI message format

### Tools System
- Initial implementation includes a get date/time tool
- Project structure should allow for easily adding more tools
- Tools should be modular and independently maintainable

### Tool Call Persistence & Memory Management
- **In-Memory Storage**: Tool calls and their results are stored in memory to maintain conversation context
- **Invisible Operation**: Tool calls operate seamlessly without any visual indication to users  
- **Context Reconstruction**: When building AI context from Discord messages, stored tool calls are reinserted at the correct positions
- **Memory Cleanup**: Old tool calls are automatically cleaned up when messages fall outside the history window
- **Associative Storage**: Tool calls are associated with Discord messages using message ID and timestamp as composite keys

### Data Management
- No database required initially
- Configuration through config files
- Messages are fetched at runtime when needed
- Tool calls stored temporarily in memory for context continuity

### Project Structure
- Modular design to facilitate contributions
- Clear separation of concerns
- Components should be independently modifiable

## Future Considerations
- Potential for database integration
- Expansion of the tools ecosystem
- Enhanced permission systems
- More sophisticated AI interaction patterns
- Persistent tool call storage for long-term context 