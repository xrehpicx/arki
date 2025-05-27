# Arki

A simple Discord bot powered by AI that responds to mentions and uses tools to enhance responses.

## Quick Start

1. **Install Bun**: [Download here](https://bun.sh/)
2. **Setup Environment**: Copy `env.sample` to `.env` and fill in your values
3. **Install Dependencies**: `bun install`
4. **Deploy Commands**: `bun run deploy-commands`  
5. **Start Bot**: `bun run start`

## Features

- Responds to @mentions in Discord
- AI-powered conversations using OpenRouter
- Permission system (user IDs + roles)
- Tool system (currently includes date/time)
- Slash command support
- Message splitting for long responses

## Configuration

Create a `.env` file with:

```env
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
OPENROUTER_API_KEY=your_openrouter_key
AI_MODEL_NAME=mistralai/mistral-7b-instruct
MESSAGE_HISTORY_LIMIT=10
MAX_TOKENS=2048
```

Set permissions in `src/config/permissions.json`:

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

## Documentation

- **[Complete Guide](docs/README.md)** - Full documentation
- **[Contributing](docs/contributing.md)** - How to contribute
- **[Requirements](docs/requirements.md)** - Technical requirements
- **[Tool Call System](docs/tool-call-improvements.md)** - How tool calls work

## Project Structure

```
src/
├── index.ts              # Bot setup and command loading
├── events/               # Discord event handlers  
├── commands/             # Slash commands
├── services/ai/          # AI integration
├── tools/                # AI tools (date/time, etc.)
├── utils/                # Helper functions
└── config/               # Configuration
```

## License

MIT
