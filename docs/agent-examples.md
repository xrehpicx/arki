# Agent Usage Examples

## Using the OpenProject Agent

### Basic Project Management Task
```
@Arki Can you list all the available projects in OpenProject?
```

The main agent might respond by calling the OpenProject agent:
```json
{
  "tool_calls": [
    {
      "type": "function",
      "function": {
        "name": "openproject_agent",
        "arguments": {
          "task": "list all available projects in OpenProject",
          "max_iterations": 2
        }
      }
    }
  ]
}
```

### Creating Work Packages with Context
```
@Arki I need to create a new bug report in the "Website" project for a login issue. The user can't log in with their email, and it should be assigned to the development team.
```

This would trigger:
```json
{
  "tool_calls": [
    {
      "type": "function", 
      "function": {
        "name": "openproject_agent",
        "arguments": {
          "task": "create a new bug report for a login issue",
          "context": "Project: Website, Issue: user can't log in with email, assign to development team",
          "max_iterations": 3
        }
      }
    }
  ]
}
```

### Advanced Work Package Filtering
```
@Arki Show me all open work packages assigned to John Smith that were created in the last week, sorted by priority.
```

The OpenProject agent would use advanced filtering:
```json
{
  "tool_calls": [
    {
      "type": "function",
      "function": {
        "name": "openproject_agent", 
        "arguments": {
          "task": "find work packages assigned to John Smith from last week",
          "context": "filter: open status, created in last 7 days, sort by priority",
          "max_iterations": 2
        }
      }
    }
  ]
}
```

## OpenProject Agent Internal Process

When the OpenProject agent runs, it follows this process:

### Iteration 1: List Projects
```json
{
  "tool_calls": [
    {
      "type": "function",
      "function": {
        "name": "list_projects", 
        "arguments": {}
      }
    }
  ]
}
```

### Iteration 2: Create Work Package
```json
{
  "tool_calls": [
    {
      "type": "function",
      "function": {
        "name": "create_work_package",
        "arguments": {
          "project_id": 5,
          "subject": "Login issue - users can't authenticate with email",
          "description": "Users are unable to log in using their email addresses. Investigation needed.",
          "type_id": 1,
          "priority_id": 3,
          "assignee_id": 12
        }
      }
    }
  ]
}
```

### Iteration 3: Assign Users
```json
{
  "tool_calls": [
    {
      "type": "function",
      "function": {
        "name": "assign_user",
        "arguments": {
          "work_package_id": 156,
          "assignee_name": "John Smith",
          "responsible_name": "Tech Lead"
        }
      }
    }
  ]
}
```

## Creating a Code Agent Example

Here's how you could create a specialized code agent following the same pattern:

### 1. Create Tools

```typescript
// src/tools/code-agent/tools/analyze-code-tool.ts
export const analyzeCodeTool: Tool = {
  name: 'analyze_code',
  description: 'Analyze code for issues, patterns, and improvements',
  parameters: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Code to analyze' },
      language: { type: 'string', description: 'Programming language' },
      focus: { 
        type: 'string', 
        enum: ['security', 'performance', 'style', 'bugs'],
        description: 'Analysis focus'
      }
    },
    required: ['code']
  },
  execute: async (args: ToolParams): Promise<string> => {
    // Code analysis implementation
    return 'Code analysis results...';
  }
};
```

```typescript
// src/tools/code-agent/tools/generate-tests-tool.ts
export const generateTestsTool: Tool = {
  name: 'generate_tests',
  description: 'Generate unit tests for given code',
  parameters: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'Code to test' },
      framework: { type: 'string', description: 'Testing framework to use' }
    },
    required: ['code']
  },
  execute: async (args: ToolParams): Promise<string> => {
    // Test generation implementation
    return 'Generated tests...';
  }
};
```

### 2. Create Registry

```typescript
// src/tools/code-agent/registry.ts
import { analyzeCodeTool } from "./tools/analyze-code-tool";
import { generateTestsTool } from "./tools/generate-tests-tool";

export class CodeAgentToolsRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerTool(analyzeCodeTool);
    this.registerTool(generateTestsTool);
  }
  
  // ... standard registry methods
}
```

### 3. Create Agent

```typescript
// src/tools/code-agent/index.ts
export const codeAgentTool: Tool = {
  name: 'code_agent',
  description: 'A specialized AI agent for code analysis, generation, and testing',
  parameters: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'Coding task to perform' },
      code: { type: 'string', description: 'Existing code (if any)' },
      language: { type: 'string', description: 'Programming language' }
    },
    required: ['task']
  },
  
  execute: async (args: ToolParams): Promise<string> => {
    const codeRegistry = new CodeAgentToolsRegistry();
    const codeAI = new AIService({
      // ... AI config with code-focused system prompt
      systemPrompt: `You are a Code Agent specialized in software development...`
    });
    
    // Agent implementation...
    return 'Code agent results...';
  }
};
```

## Agent Communication Flow

```
User: "@Arki Can you create a work package for the bug I found and assign it to the right team?"
  ↓
Main Agent: Calls openproject_agent tool
  ↓  
OpenProject Agent: 
  1. Calls list_projects tool to find the right project
  2. Calls create_work_package tool
  3. Calls assign_user tool to assign to appropriate team member
  4. Synthesizes results
  ↓
Main Agent: Receives comprehensive OpenProject response
  ↓
User: Gets formatted response with work package details, links, and assignment info
```

## Benefits Demonstrated

1. **Specialization**: Each agent focuses on its domain (OpenProject vs code vs other domains)
2. **Tool Isolation**: OpenProject tools don't appear in other agents
3. **Focused Prompts**: OpenProject agent has project management-specific instructions
4. **Scalability**: Easy to add new agents without complexity
5. **Maintainability**: Clear organization and separation of concerns

## Advanced Patterns

### Agent Coordination
Agents can potentially coordinate by having the main agent orchestrate multiple specialized agents:

```
User: "Create a work package for this code review and analyze the attached code"
  ↓
Main Agent:
  1. Calls openproject_agent to create work package
  2. Calls code_agent to analyze code examples
  3. Synthesizes both results
```

### OpenProject-Specific Features
The OpenProject agent provides the same filtering capabilities as the OpenProject UI:

```
User: "Show me work packages created this month with high priority in the API project"
  ↓
OpenProject Agent uses list_work_packages with filters:
- project: "API"
- priority: "high"  
- created_after: "2024-01-01"
- created_before: "2024-01-31"
```

### Type Safety & Library Integration
The OpenProject agent demonstrates proper type usage:
- Uses actual OpenProject API response types
- No unnecessary type workarounds
- Library-first approach for maximum compatibility 