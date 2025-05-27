# Hierarchical Agent Architecture

## Overview

Arki now supports a hierarchical agent system where specialized AI agents can be created as tools. This allows for better modularity and prevents the main agent from becoming overwhelmed with too many tools.

> **🔧 Recent Fixes Applied:**
> - **Fixed Research Agent Recursion**: Agents now use their own specialized tool registries instead of calling themselves
> - **Removed Token Limits**: No more `maxTokens` restrictions - Discord handles message length truncation automatically
> - **Custom Tools Support**: AIService now accepts custom tool definitions for specialized agents
> 
> **📝 Testing Note**: The bot functionality works automatically. No need to manually test unless specifically requested - the system is designed to work seamlessly in the background.

## Architecture

### Main Agent
- **Location**: Uses `src/services/ai/ai-service.ts`
- **Tools**: Basic tools + specialized agent tools
- **Registry**: `src/tools/tools-registry.ts`

### Specialized Agents (Sub-Agents)
- **Location**: `src/tools/{agent-name}/`
- **Structure**: Each agent has its own directory with:
  - `index.ts` - Main agent tool implementation
  - `registry.ts` - Local tools registry for the agent
  - `tools/` - Directory containing agent-specific tools

## Example: Research Agent

### Directory Structure
```
src/tools/research-agent/
├── index.ts                    # Main research agent tool
├── registry.ts                 # Research tools registry
└── tools/
    ├── web-search-tool.ts      # Web search capability
    └── summarize-tool.ts       # Text summarization capability
```

### Usage
The main agent can call the research agent like any other tool:

```json
{
  "name": "research_agent",
  "arguments": {
    "task": "Research the latest developments in AI multimodal models",
    "context": "Focus on vision-language models released in 2024",
    "max_iterations": 3
  }
}
```

### How It Works

1. **Tool Call**: Main agent calls `research_agent` tool
2. **Specialized AI**: Research agent creates its own `AIService` instance with:
   - Specialized system prompt for research tasks
   - Access only to research-specific tools
   - Configured iteration limits
3. **Tool Execution**: Research agent uses its specialized tools:
   - `web_search` - Find relevant information
   - `summarize_text` - Condense findings
4. **Result**: Comprehensive research report returned to main agent

## Creating New Specialized Agents

### 1. Create Agent Directory
```bash
mkdir -p src/tools/my-agent/tools
```

### 2. Create Specialized Tools
Create tools specific to your agent's domain in `src/tools/my-agent/tools/`:

```typescript
// src/tools/my-agent/tools/my-tool.ts
import type { Tool, ToolParams } from '../../tools-registry';

export const myTool: Tool = {
  name: 'my_tool',
  description: 'Description of what this tool does',
  parameters: {
    type: 'object',
    properties: {
      // Tool parameters
    },
    required: ['required_param'],
  },
  
  execute: async (args: ToolParams): Promise<string> => {
    // Tool implementation
    return 'Tool result';
  },
};
```

### 3. Create Agent Registry
```typescript
// src/tools/my-agent/registry.ts
import type { ToolDefinition } from "../../services/ai/types";
import type { Tool, ToolParams, ToolResult } from "../tools-registry";
import { myTool } from "./tools/my-tool";

export class MyAgentToolsRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerTool(myTool);
  }

  // ... registry implementation (copy from research-agent/registry.ts)
}
```

### 4. Create Main Agent Tool
```typescript
// src/tools/my-agent/index.ts
import type { Tool, ToolParams } from '../tools-registry';
import { AIService } from '../../services/ai/ai-service';
import { MyAgentToolsRegistry } from './registry';

export const myAgentTool: Tool = {
  name: 'my_agent',
  description: 'A specialized AI agent for specific tasks',
  parameters: {
    // Agent parameters
  },
  
  execute: async (args: ToolParams): Promise<string> => {
    // Create specialized registry and AI service
    const agentRegistry = new MyAgentToolsRegistry();
    const agentAI = new AIService({
      // AI service configuration with specialized system prompt
    });
    
    // Agent logic here
    return 'Agent result';
  },
};
```

### 5. Register in Main Registry
Add to `src/tools/tools-registry.ts`:

```typescript
import { myAgentTool } from "./my-agent/index";

constructor() {
  this.registerTool(dateTimeTool);
  this.registerTool(researchAgentTool);
  this.registerTool(myAgentTool);  // Add your agent
}
```

## Benefits

1. **Modularity**: Each agent focuses on specific domains
2. **Isolation**: Agent tools don't pollute the main tool space
3. **Specialized Prompts**: Each agent can have domain-specific instructions
4. **Scalability**: Easy to add new specialized agents without overwhelming the main agent
5. **Maintainability**: Clear separation of concerns and easier debugging

## Agent Communication

Agents can potentially call other agents by having access to the main tools registry, creating a hierarchical system where:

- **Level 1**: Main conversational agent
- **Level 2**: Specialized domain agents (research, coding, image processing, etc.)
- **Level 3**: Specific task tools within each domain

## Current Agents

### Research Agent (`research_agent`)
- **Purpose**: Information gathering and analysis
- **Tools**: Web search, text summarization
- **Use Cases**: Research tasks, fact checking, information synthesis

### Future Agent Ideas

- **Code Agent**: Code generation, debugging, refactoring tools
- **Image Agent**: Image processing, analysis, generation tools
- **Data Agent**: Data analysis, visualization, database tools
- **Communication Agent**: Email, calendar, notification tools

## Testing

Use the `/debug_history` command to see how agent tool calls are integrated into the conversation context. Agent tool calls are stored in memory and preserved across interactions.

## Troubleshooting

### Common Issues Fixed

#### **Research Agent Calling Itself (Fixed ✅)**
**Problem**: Research agent was trying to call the `research_agent` tool recursively, causing errors.

**Solution**: Research agents now use `customTools` parameter in `AIService` to only access their specialized tools:

```typescript
const researchAI = new AIService({
  apiKey: config.ai.apiKey,
  baseUrl: config.ai.baseUrl,
  modelName: config.ai.modelName,
  systemPrompt: researchSystemPrompt,
  customTools: researchRegistry.getToolDefinitions(), // Isolated tools only
});
```

#### **Token Limit Issues (Fixed ✅)**
**Problem**: Artificial token limits were causing credit issues and unnecessary restrictions.

**Solution**: Removed `maxTokens` configuration completely - Discord automatically handles message length limits:

```typescript
// Before (problematic)
maxTokens: config.ai.maxTokens, // Artificial limit

// After (fixed) 
// No maxTokens - let Discord handle message length limits
```

#### **Tool Registry Conflicts (Fixed ✅)**  
**Problem**: Specialized agents were accessing the global tools registry instead of their own.

**Solution**: Each agent now creates and uses its own `ToolsRegistry` instance with only relevant tools.

### Best Practices

1. **Agent Isolation**: Always use `customTools` for specialized agents to prevent tool pollution
2. **No Token Limits**: Let Discord handle message truncation naturally
3. **Tool Testing**: Use `/debug_history` to verify agent tool calls work correctly
4. **Error Handling**: Agents include comprehensive error handling with iteration limits

> **⚠️ Important**: Don't manually test bot startup unless specifically needed - the system is designed to work automatically. 