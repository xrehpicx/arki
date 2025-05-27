# Contribution Rules for Arki

Welcome to the Arki codebase! To keep the project maintainable, scalable, and easy to contribute to, please follow these rules and best practices when making changes or adding new features.

## 1. Project Structure & File Placement

- **Slash Commands:** Place new Discord slash command definitions in `src/commands/`. Each command should be in its own file (e.g., `status.ts`).
  - Register commands using the `bun run deploy-commands` script.
- **Event Handlers:** All Discord event handlers (e.g., `messageCreate`, `interactionCreate`, `ready`) go in `src/events/` or are handled in `src/index.ts`.
- **Configuration:** All configuration files (e.g., `config.ts`, `permissions.json`) and schemas go in `src/config/`.
- **AI Services:** Abstractions and integrations for AI (OpenAI/OpenRouter) go in `src/services/ai/`.
- **AI Tools:** Tools callable by the AI (e.g., `get_date_time`) go in `src/tools/`. Each tool should be in its own file and registered in `tools-registry.ts`.
- **Utilities:** General-purpose helpers and utilities (e.g., `permissions.ts`, `message-utils.ts`) go in `src/utils/`.
- **Types:**
  - Shared types/interfaces should be placed in the most relevant directory (e.g., `src/services/ai/types.ts` for AI-related types, or `src/index.ts` for general command types if not too large).
  - Prefer importing types using `import type { ... } from './path';` rather than redefining them.

## 2. TypeScript Best Practices

- **Type Imports:** Always use `import type { MyType } from './my-module';` when importing only types. This helps with build optimization and clarity.
- **Library Types First:** **ALWAYS use types from the actual libraries (discord.js, OpenAI SDK, etc.) instead of creating custom duplicates.** If you need to extend or modify a library type, extend it properly using TypeScript's type system.
- **Type Re-exports:** If you need to make library types more accessible, re-export them from a central location rather than duplicating the type definition.
- **Type Assertions:** Use type assertions sparingly and only when you're certain about the type. Prefer type guards or proper type checking.
- **Type Declarations:**
  - If a type is used across multiple files within a specific domain (e.g., AI services), declare it in a shared `types.ts` file in that domain's directory.
  - For globally used types or types specific to a single file, declare them at the top of the relevant file or in a general types definition file if appropriate.
- **Type Safety:** Always use explicit types for function arguments, return values, and variable declarations where the type isn't immediately obvious from the assignment.
- **Avoid `any` Type:** Never use the `any` type as it defeats the purpose of TypeScript's type checking. Instead:
  - Use proper interfaces and types for all values
  - Use `unknown` if you need a type-safe alternative to `any`
  - For objects with dynamic keys, use `Record<string, T>` with a specific type T
  - For functions with dynamic arguments, define appropriate interfaces

### ⚠️ Critical Rule: Use Library Types, Don't Duplicate Them

**DO NOT create custom types that duplicate existing library types.** This causes:
- Type casting issues when moving between functions
- Maintenance overhead when libraries update
- Loss of library-specific features and constraints
- Unnecessary complexity

**Also avoid unnecessary type workarounds unless absolutely necessary for functionality.**

**Examples:**

✅ **CORRECT - Use library types directly:**
```typescript
import type OpenAI from "openai";
import type { Message, Attachment } from "discord.js";

// Re-export if needed for convenience
export type AIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
export type ToolCall = OpenAI.Chat.Completions.ChatCompletionMessageToolCall;

// Use Discord.js types directly
function processMessage(message: Message): void {
  // Direct use of library types
}
```

❌ **WRONG - Creating custom duplicates or unnecessary workarounds:**
```typescript
// Don't do this - duplicates OpenAI SDK types
interface CustomAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  // Missing library-specific fields and constraints
}

// Don't do this - unnecessary type workaround
const messageAsAny = message as any; // Avoid unless absolutely necessary
```

**When you need application-specific types:**
- **Configuration interfaces** - Create these for app-specific settings
- **Internal data structures** - Create these for app-specific data storage
- **API wrappers** - Create these only for response/request formatting
- **Business logic types** - Create these for domain-specific concepts

**When extending library types:**
```typescript
// Extend library types properly
interface ExtendedMessage extends Message {
  customProperty: string;
}

// Or use intersection types
type MessageWithMetadata = Message & {
  processingTimestamp: number;
};
```

**Avoiding Type Workarounds:**
- **Prefer proper typing** over `as any` or `as unknown`
- **Use type guards** when you need to narrow types
- **Properly type function parameters** instead of using generic objects
- **Only use type assertions** when you're absolutely certain about the type and there's no other way

## 3. Adding New Slash Commands

1.  Create a new file in `src/commands/` (e.g., `mycommand.ts`).
2.  Use `SlashCommandBuilder` from `discord.js` to define the command's name, description, and options.
3.  Export a `data` object (the command builder instance) and an async `execute` function that takes an `interaction` object.
    ```typescript
    import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

    export const data = new SlashCommandBuilder()
      .setName('newcommand')
      .setDescription('Does something cool.');

    export async function execute(interaction: ChatInputCommandInteraction) {
      // Your command logic here
      await interaction.reply('Cool command executed!');
    }
    ```
4.  The main bot file (`src/index.ts`) automatically loads command files from this directory.
5.  After adding or modifying commands, run `bun run deploy-commands` to update Discord with the changes. For development, deploying to a specific guild (via `ENABLED_GUILD_IDS` in `.env`) is faster.

## 4. Adding New AI Tools

- Create a new file in `src/tools/` for your tool.
- Implement the `Tool` interface (see `src/tools/tools-registry.ts` or other tools for examples).
- Register your tool in the `ToolsRegistry` constructor in `src/tools/tools-registry.ts`.
- Document your tool with a clear description and a JSON schema for its parameters.

## 5. Configuration & Secrets

- Never commit real secrets or tokens (e.g., `DISCORD_BOT_TOKEN`, `OPENROUTER_API_KEY`).
- Use environment variables loaded via `dotenv` from a `.env` file (which is gitignored).
- Refer to `env.sample` for required environment variables.
- Add new configuration options to `src/config/config.ts` and document their purpose and usage.

## 6. Permissions & Security

- User permission checks for AI interactions are handled in `src/utils/permissions.ts` based on `src/config/permissions.json` and `ENABLED_GUILD_IDS`.
  - The `permissions.json` file defines `allowedUsers` (list of user IDs) and optionally `allowedRoles` (list of role names) for each configured guild.
  - If `allowedRoles` is not provided or is empty for a guild, `allowedUsers` must be present and non-empty for that guild's permissions to be valid.
  - The authorization logic is as follows:
    1. If the user's ID is in `allowedUsers`, access is granted.
    2. If not, and if `allowedRoles` are defined for the guild, the user's roles are checked. If they have an allowed role, access is granted.
    3. Otherwise, access is denied.
- Slash command permissions can be managed via Discord's UI or by setting default member permissions on the command data if needed.

## 7. Code Style & Quality

- Follow existing code style and naming conventions (camelCase for variables/functions, PascalCase for types/classes/interfaces).
- Write clear, JSDoc-style comments for functions, classes, and complex logic sections.
- Prefer `async/await` for asynchronous operations.
- Handle errors gracefully. For user-facing errors (like in commands), provide a helpful message.

## 8. Extensibility & Modularity

- Design components (commands, tools, services) to be modular and loosely coupled.
- Aim for small, focused files and functions where possible.

## 9. Documentation

- Update `README.md` if your changes affect setup, core features, or how to run the bot.
- Update `REQUIREMENTS.md` if the project's functional or technical requirements change.
- Document new AI tools or complex slash commands clearly.

## 10. Testing & Validation

- Test your changes locally. For slash commands, use a development guild.
- Ensure `validateConfig()` in `src/config/config.ts` checks for essential new configurations if you add any.

## 11. Pull Requests

- Create small, focused PRs that address a single feature or bug fix.
- Write a clear PR description explaining the changes and their purpose.
- Reference any related issues.

## 12. Tool Call Handling & Memory Management

- **Tool Call Storage**: Tool calls and their results are stored in memory via `ToolCallsStore` to maintain conversation context across multiple AI interactions.
- **Association Pattern**: Tool calls are associated with Discord messages using a composite key of message ID and timestamp.
- **Context Reconstruction**: When building AI context from Discord message history, tool calls are retrieved from the store and inserted into the conversation flow at the correct positions.
- **Invisible Operation**: Tool calls operate seamlessly in the background without any visual indication to users.
- **Memory Lifecycle**: Tool calls are automatically cleaned up when their associated messages fall outside the configured message history window.
- **Message Order**: Tool calls are inserted BEFORE the bot's final response in the conversation flow to maintain proper AI context ordering.

### Tool Call Implementation Guidelines

- Tool calls are processed and stored entirely in memory (no Discord embeds)
- Store tool calls against the bot's response message, not the user's trigger message
- Use `ToolCallsStore.getInstance()` to access the singleton store
- Clean up old tool calls regularly using `cleanupOldToolCalls()` with recent message history
- Handle tool call retrieval in `convertToAIMessages()` to ensure proper context reconstruction
- Tool usage is invisible to users but preserved for AI context continuity

---

By following these rules, you help keep Arki maintainable and welcoming for all contributors. Thank you! 