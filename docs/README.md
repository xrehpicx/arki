# Arki Documentation

## Overview
Arki is a Discord bot that responds to mentions and uses AI to generate helpful responses. It features **native multimodal support** using OpenAI SDK's image_url and audio content types, plus enhanced Discord content parsing for comprehensive AI context.

## Quick Start

1. **Install Bun**: [Download here](https://bun.sh/)
2. **Setup Environment**: Copy `env.sample` to `.env` and fill in your values
   - Configure your OpenProject instance URL and API key
3. **Install Dependencies**: `bun install`
4. **Deploy Commands**: `bun run deploy-commands`
5. **Start Bot**: `bun run start`

## How It Works

See **[Message Flow](flow.md)** for a detailed step-by-step explanation.

### Basic Flow
1. User mentions @Arki in Discord
2. Bot checks if user has permission
3. Bot fetches recent message history
4. Bot converts messages to OpenAI format with **native multimodal content**
5. AI generates response (may use tools)
6. Bot sends response back to Discord

### 🎨 Native Multimodal Support
Arki now uses OpenAI SDK's native content types instead of converting everything to text:

#### **Images** 🖼️
- **Native Support**: Images sent as `image_url` content parts
- **Direct Processing**: AI models receive images directly (not text descriptions)
- **Better Understanding**: Improved image analysis and context awareness
- **Auto Detail**: Automatically sets detail level for optimal processing

#### **Audio** 🎵
- **Ready for Native Audio**: Framework supports `input_audio` content parts
- **Base64 Support**: Can handle base64-encoded audio when available
- **Multiple Formats**: Supports wav, mp3, flac, aac, ogg, pcm formats
- **Fallback**: Currently uses text descriptions for Discord audio URLs

#### **Text with Rich Context** 📝
- **Usernames**: User display names included in OpenAI `name` field
- **Smart Grouping**: Related content grouped in multimodal arrays
- **Context Preservation**: Timestamps, reactions, and metadata as text

#### **Smart Content Conversion**
- **Native When Possible**: Images → native image_url, audio → native input_audio
- **Text When Needed**: Embeds, stickers, polls → descriptive text
- **Hybrid Approach**: Mixed content arrays with both native and text parts

### Enhanced Discord Integration Features
- **Attachments**: Smart native/text conversion based on type
- **Embeds**: Rich embeds parsed with titles, descriptions, fields, and metadata
- **Stickers**: Discord stickers converted to text descriptions
- **Reactions**: Message reactions included in context
- **Replies**: Message references (replies) detected and included
- **Polls**: Poll questions and options converted to text format
- **Timestamps**: Message timestamps added for temporal context
- **Tool Integration**: AI tool calls seamlessly integrated from memory
- **Hierarchical Agents**: Specialized AI agents as tools for modular functionality

### 🤖 Hierarchical Agent System
Arki now supports specialized AI agents as tools, each with their own toolsets:

#### **Main Agent**
- **Core Functions**: Conversational AI, basic tools, coordination
- **Agent Management**: Can delegate specialized tasks to sub-agents
- **Context Management**: Maintains conversation flow with tool call persistence

#### **Specialized Agents**
- **OpenProject Agent**: Project management, work package creation, issue tracking, user assignment
- **Modular Design**: Each agent has its own AI service instance and tools
- **Isolated Toolsets**: Agent-specific tools don't clutter the main agent
- **Custom Prompts**: Domain-specific system prompts for optimal performance

**Benefits:**
- **Better Organization**: Tools grouped by domain expertise
- **Scalability**: Easy to add new specialized agents
- **Performance**: Focused agents with relevant tools only
- **Maintainability**: Clear separation of concerns

See **[Hierarchical Agents Guide](hierarchical-agents.md)** for detailed implementation.

### Project Structure
```
src/
├── index.ts              # Bot setup and command loading
├── events/               # Discord event handlers
│   └── message-handler.ts
├── commands/             # Slash commands
│   └── debug_history.ts  # Native multimodal content demo
├── services/ai/          # AI integration
│   └── types.ts          # Native multimodal content types
├── tools/                # AI tools and specialized agents
│   ├── date-time-tool.ts # Basic date/time tool
│   ├── openproject-agent/   # OpenProject specialized agent
│   │   ├── index.ts      # OpenProject agent tool
│   │   ├── registry.ts   # OpenProject tools registry
│   │   ├── types.ts      # OpenProject API types (library-first approach)
│   │   ├── api-client.ts # OpenProject API client
│   │   └── tools/        # OpenProject-specific tools
│   │       ├── list-projects-tool.ts
│   │       ├── create-work-package-tool.ts
│   │       ├── list-work-packages-tool.ts
│   │       └── assign-user-tool.ts
│   └── tools-registry.ts # Main tools registry
├── utils/                # Helper functions
│   └── message-utils.ts  # Native multimodal message conversion
└── config/               # Configuration
```

## Adding Features

### New Slash Command
1. Create file in `src/commands/yourcommand.ts`
2. Export `data` (SlashCommandBuilder) and `execute` function
3. Run `bun run deploy-commands`

### New AI Tool
1. Create file in `src/tools/yourtool.ts`
2. Implement the `Tool` interface
3. Register in `src/tools/tools-registry.ts`

### New Specialized Agent
1. Create directory `src/tools/agent-name/`
2. Create specialized tools in `src/tools/agent-name/tools/`
3. Create agent registry in `src/tools/agent-name/registry.ts`
4. Create main agent tool in `src/tools/agent-name/index.ts`
5. Register agent in `src/tools/tools-registry.ts`
6. See **[Hierarchical Agents Guide](hierarchical-agents.md)** for details

## Configuration

All configuration is done through environment variables in `.env`:

- `DISCORD_BOT_TOKEN` - Your Discord bot token
- `DISCORD_CLIENT_ID` - Your Discord application client ID  
- `OPENROUTER_API_KEY` - Your OpenRouter API key
- `AI_MODEL_NAME` - AI model to use (default: mistralai/mistral-7b-instruct)
- `MESSAGE_HISTORY_LIMIT` - How many messages to include in context (default: 10)
- `MAX_TOKENS` - Maximum tokens per request (default: 2048)
- `ENABLED_GUILD_IDS` - Comma-separated guild IDs for testing
- `OPENPROJECT_BASE_URL` - Your OpenProject instance URL (e.g., https://project.xcelerator.work)
- `OPENPROJECT_API_KEY` - Your OpenProject API key for authentication

## Permissions

Permissions are configured in `src/config/permissions.json`:

```json
{
  "your_guild_id": {
    "allowedUsers": ["user_id_1", "user_id_2"],
    "allowedRoles": ["Admin", "Moderator"]
  }
}
```

## Development

- `bun run dev` - Start with auto-reload
- `bun run start` - Production start
- `bun run deploy-commands` - Deploy slash commands
- `/debug_history` - Test native multimodal conversion

> **📝 Note**: Bot functionality works automatically in the background. Manual testing is only needed when specifically requested.

## Performance Benefits

🚀 **Native Multimodal Advantages:**
- **Better AI Understanding**: Images sent directly to vision models
- **Reduced Token Usage**: Images don't consume text tokens
- **Improved Accuracy**: AI sees actual visual content, not descriptions
- **Future-Ready**: Framework supports upcoming audio and video features
- **OpenAI Compatibility**: Full compatibility with OpenAI SDK content types

## Architecture Notes

- Tool calls are stored in memory for context continuity
- Messages use OpenAI SDK's native multimodal content format
- Images sent as `image_url` content parts (not text descriptions)
- Bot only responds to direct mentions
- All configuration is validated on startup
- **Types**: Uses actual library types from discord.js, OpenAI SDK, and OpenProject API instead of custom duplicates (see [Contributing Guidelines](contributing.md#critical-rule-use-library-types-dont-duplicate-them) for details)
- **No Type Workarounds**: Avoids unnecessary type workarounds unless absolutely necessary for functionality