# Technical Implementation Plan: Project-Scoped Context System

**Version:** 1.0  
**Status:** Implementation Blueprint  
**Technical Lead:** Relentless Systems Architecture  
**Date:** 2026-01-21

---

## 1. Executive Summary

This document provides the complete technical implementation plan for the Hierarchical Context Management System. The implementation leverages Convex as the backend infrastructure, TypeScript for type safety, and React for frontend rendering. The system is architected as a **multi-agent pipeline** with clear separation of concerns across context building, memory management, NLP classification, and UI state management.

**Key Technical Decisions:**

- Convex for ACID-compliant data layer and real-time reactivity
- **Convex Dynamic Agents (`@convex-dev/agent`)** for runtime agent definition with multi-model support
- Vector embeddings for semantic memory retrieval (OpenAI `text-embedding-3-small`)
- Agent-based architecture for modularity and testability
- Runtime model selection via Dynamic Agent language model injection
- React Context API + Jotai for client-side state management
- Progressive enhancement strategy for backward compatibility

---

## 2. Convex Schema Design

### 2.1 Core Tables

```typescript
// schema.ts

import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Projects table
  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    archivedAt: v.optional(v.number()),
    metadata: v.object({
      description: v.optional(v.string()),
      icon: v.optional(v.string()),
      color: v.optional(v.string()),
    }),
  })
    .index('by_user', ['userId'])
    .index('by_user_archived', ['userId', 'archivedAt'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['userId', 'archivedAt'],
    }),

  // Threads table (extended from existing chats/conversations)
  threads: defineTable({
    userId: v.string(),
    projectId: v.optional(v.id('projects')),
    title: v.string(),
    mode: v.union(
      v.literal('code'),
      v.literal('learn'),
      v.literal('think'),
      v.literal('create'),
    ),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    metadata: v.object({
      messageCount: v.number(),
      lastModel: v.optional(v.string()),
      isPinned: v.boolean(),
    }),
  })
    .index('by_user', ['userId'])
    .index('by_user_project', ['userId', 'projectId'])
    .index('by_user_last_active', ['userId', 'lastActiveAt'])
    .index('by_project', ['projectId']),

  // Messages table (existing, no changes required)
  messages: defineTable({
    threadId: v.id('threads'),
    userId: v.string(),
    role: v.union(
      v.literal('user'),
      v.literal('assistant'),
      v.literal('system'),
    ),
    content: v.string(),
    createdAt: v.number(),
    metadata: v.object({
      model: v.optional(v.string()),
      tokenCount: v.optional(v.number()),
      contextSnapshot: v.optional(v.any()), // Stores active project ID at inference time
    }),
  })
    .index('by_thread', ['threadId'])
    .index('by_thread_created', ['threadId', 'createdAt']),

  // Memory entries
  memories: defineTable({
    userId: v.string(),
    scope: v.union(
      v.literal('profile'),
      v.literal('skill'),
      v.literal('project'),
      v.literal('thread'),
      v.literal('pinned'),
    ),
    scopeId: v.optional(v.string()), // projectId or threadId
    content: v.string(),
    embedding: v.array(v.float64()),
    relevanceScore: v.float64(), // Computed on retrieval
    recencyScore: v.float64(),
    importanceScore: v.float64(),
    createdAt: v.number(),
    updatedAt: v.number(),
    metadata: v.object({
      source: v.optional(v.string()), // "user", "agent", "system"
      tags: v.optional(v.array(v.string())),
    }),
  })
    .index('by_user_scope', ['userId', 'scope'])
    .index('by_user_scope_id', ['userId', 'scope', 'scopeId'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536, // text-embedding-3-small
      filterFields: ['userId', 'scope', 'scopeId'],
    }),

  // Project mentions (tracking @Project usage)
  projectMentions: defineTable({
    userId: v.string(),
    threadId: v.id('threads'),
    projectId: v.id('projects'),
    messageId: v.id('messages'),
    mentionedAt: v.number(),
    attachmentOffered: v.boolean(), // Whether banner was shown
    attachmentAccepted: v.optional(v.boolean()), // User response
  })
    .index('by_thread', ['threadId'])
    .index('by_thread_project', ['threadId', 'projectId']),
})
```

### 2.2 Schema Migration Strategy

**Backward Compatibility:**

- Existing `chats` table → migrated to `threads` table
- Add `projectId` field as optional (default `null`)
- Backfill existing threads with `projectId: null` (free chats)

**Migration Script:**

```typescript
// convex/migrations/001_add_projects.ts

import { mutation } from './_generated/server'

export const migrateChatsToThreads = mutation({
  handler: async (ctx) => {
    const chats = await ctx.db.query('chats').collect()

    for (const chat of chats) {
      await ctx.db.insert('threads', {
        userId: chat.userId,
        projectId: undefined,
        title: chat.title || 'Untitled',
        mode: chat.mode || 'think',
        createdAt: chat.createdAt,
        lastActiveAt: chat.lastActiveAt || chat.createdAt,
        metadata: {
          messageCount: chat.messageCount || 0,
          lastModel: chat.lastModel,
          isPinned: false,
        },
      })
    }

    console.log(`Migrated ${chats.length} chats to threads`)
  },
})
```

---

## 3. Agent Architecture

### 3.1 Dynamic Agent Pattern

The system uses **Convex Dynamic Agents** (`@convex-dev/agent`) for runtime agent definition with per-request model selection. This pattern allows:

1. **Runtime Model Selection:** Different models (GPT-4, Claude, etc.) selected dynamically based on mode/intent
2. **Context Binding:** Agent tools have access to thread/project context without redundant parameter passing
3. **Multi-Step Reasoning:** Agents can execute multi-step workflows with built-in tool orchestration
4. **Type Safety:** Full TypeScript support with Convex schema integration

**Dynamic Agent Factory Pattern:**

```typescript
import { Agent } from '@convex-dev/agent'
import type { LanguageModel } from 'ai'
import type { ActionCtx } from './_generated/server'
import { components } from './_generated/api'

function createContextAgent(
  ctx: ActionCtx,
  threadId: Id<'threads'>,
  projectId: Id<'projects'> | undefined,
  model: LanguageModel,
) {
  return new Agent(components.agent, {
    name: 'ContextAgent',
    languageModel: model, // Dynamically selected model
    tools: {
      buildContext: buildContextTool(ctx, threadId, projectId),
      extractMemories: extractMemoriesTool(ctx, threadId, projectId),
      rankMemories: rankMemoriesTool(ctx, projectId),
    },
    maxSteps: 5,
  })
}
```

### 3.2 Agent System Overview

The system employs **five specialized agent factories** that compose the context pipeline:

```
User Input
    ↓
┌────────────────────────────┐
│ NLP Classifier Agent       │ (Extracts @mentions, classifies intent)
│ Factory                    │ [Action, not Agent - no LLM needed]
└────────────────────────────┘
    ↓
┌────────────────────────────┐
│ Context Builder Agent      │ (Assembles ranked context)
│ Factory → Dynamic Agent    │ [Uses LLM for semantic ranking]
│ Model: Selected by Router  │
└────────────────────────────┘
    ↓
┌────────────────────────────┐
│ Model Router               │ (Selects optimal model)
│ Factory                    │ [Pure function, returns LanguageModel]
└────────────────────────────┘
    ↓
┌────────────────────────────┐
│ Inference Agent            │ (Main AI response generation)
│ Factory → Dynamic Agent    │ [Uses selected model with context]
│ Model: From Router         │
└────────────────────────────┘
    ↓
┌────────────────────────────┐
│ Memory Manager Agent       │ (Stores/updates memories post-inference)
│ Factory → Dynamic Agent    │ [Uses LLM for fact extraction]
│ Model: GPT-4 Turbo         │
└────────────────────────────┘
    ↓
┌────────────────────────────┐
│ UX State Agent             │ (Triggers attachment banner)
│ Factory                    │ [Action, not Agent - no LLM needed]
└────────────────────────────┘
```

### 3.2 Agent Specifications

#### **Agent 1: NLP Classifier Agent**

**Responsibility:** Parse user input to extract `@Project` mentions and classify message intent.

**Input:**

```typescript
{
  userId: string,
  threadId: string,
  messageContent: string
}
```

**Output:**

```typescript
{
  projectMentions: Array<{
    projectId: string,
    projectName: string,
    startIndex: number,
    endIndex: number
  }>,
  intent: "question" | "command" | "statement" | "code_request",
  entities: Array<string>
}
```

**Implementation:**

```typescript
// convex/agents/nlpClassifier.ts

import { action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'

export const classifyMessage = action({
  args: {
    userId: v.string(),
    threadId: v.id('threads'),
    messageContent: v.string(),
  },
  handler: async (ctx, args) => {
    // Extract @Project mentions using regex
    const mentionRegex = /@([a-zA-Z0-9\s]+)/g
    const mentions = []
    let match

    while ((match = mentionRegex.exec(args.messageContent)) !== null) {
      const projectName = match[1].trim()

      // Query projects table for matching name
      const project = await ctx.runQuery(api.projects.getByName, {
        userId: args.userId,
        name: projectName,
      })

      if (project) {
        mentions.push({
          projectId: project._id,
          projectName: project.name,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        })
      }
    }

    // Classify intent (simple keyword-based for MVP)
    let intent = 'statement'
    if (args.messageContent.includes('?')) intent = 'question'
    if (args.messageContent.match(/^(create|build|implement|add)/i))
      intent = 'command'
    if (args.messageContent.match(/(code|function|class|component)/i))
      intent = 'code_request'

    return {
      projectMentions: mentions,
      intent,
      entities: mentions.map((m) => m.projectName),
    }
  },
})
```

---

#### **Agent 2: Context Builder Agent**

**Responsibility:** Assemble ranked context from thread history, project memory, and pinned memory.

**Input:**

```typescript
{
  threadId: string,
  userId: string,
  projectMentions: Array<{ projectId: string }>,
  currentProjectId?: string
}
```

**Output:**

```typescript
{
  context: Array<ContextItem>,
  tokenCount: number,
  sources: Array<"thread" | "project" | "pinned" | "profile">
}

ContextItem = {
  type: "message" | "memory",
  content: string,
  source: string,
  rank: number
}
```

**Implementation:**

```typescript
// convex/agents/contextBuilder.ts

import { action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'

export const buildContext = action({
  args: {
    threadId: v.id('threads'),
    userId: v.string(),
    projectMentions: v.array(v.object({ projectId: v.string() })),
    currentProjectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    const context = []

    // 1. Thread history (last N messages)
    const messages = await ctx.runQuery(api.messages.getByThread, {
      threadId: args.threadId,
      limit: 20,
    })

    for (const msg of messages) {
      context.push({
        type: 'message',
        content: msg.content,
        source: 'thread',
        rank: 1.0, // Highest priority
      })
    }

    // 2. Project memory (if thread attached to project OR @mentioned)
    const projectIds = new Set()
    if (args.currentProjectId) projectIds.add(args.currentProjectId)
    args.projectMentions.forEach((m) => projectIds.add(m.projectId))

    for (const projectId of projectIds) {
      const projectMemories = await ctx.runQuery(api.memories.getByScope, {
        userId: args.userId,
        scope: 'project',
        scopeId: projectId,
        limit: 10,
      })

      for (const mem of projectMemories) {
        context.push({
          type: 'memory',
          content: mem.content,
          source: `project:${projectId}`,
          rank: 0.8,
        })
      }
    }

    // 3. Pinned memory
    const pinnedMemories = await ctx.runQuery(api.memories.getByScope, {
      userId: args.userId,
      scope: 'pinned',
      limit: 5,
    })

    for (const mem of pinnedMemories) {
      context.push({
        type: 'memory',
        content: mem.content,
        source: 'pinned',
        rank: 0.9,
      })
    }

    // 4. Rank and truncate to token limit
    context.sort((a, b) => b.rank - a.rank)

    // Truncate to 8000 tokens (rough estimate: 1 token ≈ 4 chars)
    const MAX_TOKENS = 8000
    let tokenCount = 0
    const truncatedContext = []

    for (const item of context) {
      const itemTokens = Math.ceil(item.content.length / 4)
      if (tokenCount + itemTokens > MAX_TOKENS) break
      truncatedContext.push(item)
      tokenCount += itemTokens
    }

    return {
      context: truncatedContext,
      tokenCount,
      sources: [
        ...new Set(truncatedContext.map((c) => c.source.split(':')[0])),
      ],
    }
  },
})
```

---

#### **Agent 3: Model Router (Factory Function)**

**Responsibility:** Select optimal `LanguageModel` instance based on mode, intent, and context length. Returns a configured model object for Dynamic Agent instantiation.

**Input:**

```typescript
{
  mode: "code" | "learn" | "think" | "create",
  intent: string,
  contextTokenCount: number
}
```

**Output:**

```typescript
{
  languageModel: LanguageModel, // Configured model instance from AI SDK
  maxTokens: number,
  temperature: number
}
```

**Implementation:**

```typescript
// convex/agents/modelRouter.ts

import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'

export function selectModel(args: {
  mode: 'code' | 'learn' | 'think' | 'create'
  intent: string
  contextTokenCount: number
}): {
  languageModel: LanguageModel
  maxTokens: number
  temperature: number
} {
  // Default configuration
  let languageModel: LanguageModel = openai('gpt-4-turbo')
  let maxTokens = 4000
  let temperature = 0.7

  // Mode-based selection
  if (args.mode === 'code') {
    languageModel = openai('gpt-4-turbo')
    temperature = 0.2
    maxTokens = 8000
  } else if (args.mode === 'learn') {
    languageModel = openai('gpt-4-turbo')
    temperature = 0.5
  } else if (args.mode === 'think') {
    languageModel = anthropic('claude-3-opus-20240229')
    temperature = 0.8
  } else if (args.mode === 'create') {
    languageModel = openai('gpt-4-turbo')
    temperature = 0.9
    maxTokens = 6000
  }

  // Adjust for long context
  if (args.contextTokenCount > 6000) {
    languageModel = anthropic('claude-3-opus-20240229')
  }

  return { languageModel, maxTokens, temperature }
}
```

**Usage in Message Send Pipeline:**

```typescript
// Used to create Dynamic Agent with selected model
const { languageModel, maxTokens, temperature } = selectModel({
  mode: thread.mode,
  intent: classifiedIntent,
  contextTokenCount: context.tokenCount,
})

const agent = createInferenceAgent(ctx, threadId, projectId, languageModel)
```

**Output:**

```typescript
{
  model: string, // e.g., "gpt-4", "claude-3-opus"
  maxTokens: number,
  temperature: number
}
```

**Implementation:**

```typescript
// convex/agents/modelRouter.ts

import { action } from './_generated/server'
import { v } from 'convex/values'

export const selectModel = action({
  args: {
    mode: v.union(
      v.literal('code'),
      v.literal('learn'),
      v.literal('think'),
      v.literal('create'),
    ),
    intent: v.string(),
    contextTokenCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Model selection logic
    let model = 'gpt-4-turbo'
    let maxTokens = 4000
    let temperature = 0.7

    if (args.mode === 'code') {
      model = 'gpt-4-turbo'
      temperature = 0.2
      maxTokens = 8000
    } else if (args.mode === 'learn') {
      model = 'gpt-4-turbo'
      temperature = 0.5
    } else if (args.mode === 'think') {
      model = 'claude-3-opus'
      temperature = 0.8
    } else if (args.mode === 'create') {
      model = 'gpt-4-turbo'
      temperature = 0.9
      maxTokens = 6000
    }

    // Adjust for context length
    if (args.contextTokenCount > 6000) {
      model = 'claude-3-opus' // Better long-context handling
    }

    return { model, maxTokens, temperature }
  },
})
```

---

#### **Agent 4: Memory Manager (Dynamic Agent)**

**Responsibility:** Extract and store memories from conversation after inference using a Dynamic Agent with LLM-powered fact extraction.

**Input:**

```typescript
{
  threadId: string,
  userId: string,
  projectId?: string,
  userMessage: string,
  assistantMessage: string
}
```

**Output:**

```typescript
{
  memoriesCreated: number,
  memoryIds: Array<string>
}
```

**Implementation:**

```typescript
// convex/agents/memoryManager.ts

import { Agent } from '@convex-dev/agent'
import { openai } from '@ai-sdk/openai'
import { action } from './_generated/server'
import { v } from 'convex/values'
import { api, components } from './_generated/api'
import type { ActionCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

// Tool: Extract facts from conversation
function extractFactsTool(ctx: ActionCtx) {
  return {
    description: 'Extract key factual statements from a conversation',
    parameters: v.object({
      userMessage: v.string(),
      assistantMessage: v.string(),
    }),
    handler: async ({ userMessage, assistantMessage }) => {
      // Returns structured facts for the agent to process
      return {
        facts: [
          // Agent will populate this via LLM
        ],
      }
    },
  }
}

// Tool: Generate embedding for memory content
function generateEmbeddingTool(ctx: ActionCtx) {
  return {
    description: 'Generate vector embedding for memory content',
    parameters: v.object({
      content: v.string(),
    }),
    handler: async ({ content }) => {
      const { embed } = await import('ai')
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value: content,
      })
      return { embedding }
    },
  }
}

// Tool: Store memory in database
function storeMemoryTool(
  ctx: ActionCtx,
  userId: string,
  threadId: Id<'threads'>,
  projectId: Id<'projects'> | undefined,
) {
  return {
    description: 'Store extracted memory with embedding',
    parameters: v.object({
      content: v.string(),
      embedding: v.array(v.float64()),
    }),
    handler: async ({ content, embedding }) => {
      const memoryId = await ctx.runMutation(api.memories.create, {
        userId,
        scope: projectId ? 'project' : 'thread',
        scopeId: projectId || threadId,
        content,
        embedding,
        importanceScore: 0.5,
        recencyScore: 1.0,
        relevanceScore: 0.0,
      })
      return { memoryId }
    },
  }
}

// Dynamic Agent Factory
function createMemoryAgent(
  ctx: ActionCtx,
  userId: string,
  threadId: Id<'threads'>,
  projectId: Id<'projects'> | undefined,
) {
  return new Agent(components.agent, {
    name: 'MemoryExtractor',
    languageModel: openai('gpt-4-turbo'),
    instructions: `You are a memory extraction agent. Extract key factual statements from conversations.
    
Rules:
1. Extract only factual, verifiable statements
2. Ignore pleasantries and non-informative content
3. Each fact should be a complete, standalone statement
4. Generate embeddings for each fact
5. Store facts in the appropriate scope (project or thread)`,
    tools: {
      extractFacts: extractFactsTool(ctx),
      generateEmbedding: generateEmbeddingTool(ctx),
      storeMemory: storeMemoryTool(ctx, userId, threadId, projectId),
    },
    maxSteps: 10,
  })
}

// Action using Dynamic Agent
export const extractAndStoreMemories = action({
  args: {
    threadId: v.id('threads'),
    userId: v.string(),
    projectId: v.optional(v.id('projects')),
    userMessage: v.string(),
    assistantMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = createMemoryAgent(
      ctx,
      args.userId,
      args.threadId,
      args.projectId,
    )

    const result = await agent.run(
      `Extract memories from this conversation:
      
User: ${args.userMessage}
Assistant: ${args.assistantMessage}

Extract facts, generate embeddings, and store them.`,
    )

    return {
      memoriesCreated:
        result.toolCalls?.filter((tc) => tc.tool === 'storeMemory').length || 0,
      memoryIds:
        result.toolCalls
          ?.filter((tc) => tc.tool === 'storeMemory')
          .map((tc) => tc.result.memoryId) || [],
    }
  },
})
```

---

#### **Main Inference Agent (Dynamic Agent)**

**Responsibility:** Generate AI response using dynamically selected model with assembled context.

**Input:**

```typescript
{
  threadId: string,
  userId: string,
  projectId?: string,
  userMessage: string,
  context: Array<ContextItem>,
  mode: "code" | "learn" | "think" | "create"
}
```

**Output:**

```typescript
{
  assistantMessage: string,
  model: string,
  tokenCount: number
}
```

**Implementation:**

```typescript
// convex/agents/inferenceAgent.ts

import { Agent } from '@convex-dev/agent'
import { action } from './_generated/server'
import { v } from 'convex/values'
import { api, components } from './_generated/api'
import type { ActionCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { LanguageModel } from 'ai'
import { selectModel } from './modelRouter'

// Tool: Search project memories
function searchMemoriesTool(
  ctx: ActionCtx,
  userId: string,
  projectId: Id<'projects'> | undefined,
) {
  return {
    description: 'Search project memories for additional context',
    parameters: v.object({
      query: v.string(),
    }),
    handler: async ({ query }) => {
      if (!projectId) return { memories: [] }

      const memories = await ctx.runQuery(api.memories.searchByQuery, {
        userId,
        scope: 'project',
        scopeId: projectId,
        query,
        limit: 5,
      })

      return { memories: memories.map((m) => m.content) }
    },
  }
}

// Tool: Get thread context
function getThreadContextTool(ctx: ActionCtx, threadId: Id<'threads'>) {
  return {
    description: 'Get recent thread messages for context',
    parameters: v.object({
      limit: v.optional(v.number()),
    }),
    handler: async ({ limit = 10 }) => {
      const messages = await ctx.runQuery(api.messages.getByThread, {
        threadId,
        limit,
      })

      return {
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }
    },
  }
}

// Dynamic Agent Factory
function createInferenceAgent(
  ctx: ActionCtx,
  threadId: Id<'threads'>,
  projectId: Id<'projects'> | undefined,
  userId: string,
  languageModel: LanguageModel,
  mode: 'code' | 'learn' | 'think' | 'create',
) {
  const modeInstructions = {
    code: 'You are an expert software engineer. Provide precise, production-ready code solutions.',
    learn:
      'You are a knowledgeable teacher. Explain concepts clearly with examples.',
    think:
      'You are a thoughtful advisor. Explore ideas deeply and consider multiple perspectives.',
    create:
      'You are a creative partner. Generate novel ideas and imaginative solutions.',
  }

  return new Agent(components.agent, {
    name: 'InferenceAgent',
    languageModel,
    instructions: `${modeInstructions[mode]}
    
You have access to project-specific memories and thread context. Use these tools when you need additional information to provide a better response.`,
    tools: {
      searchMemories: searchMemoriesTool(ctx, userId, projectId),
      getThreadContext: getThreadContextTool(ctx, threadId),
    },
    maxSteps: 3, // Limit multi-step reasoning for latency
  })
}

// Main sendMessage action
export const sendMessage = action({
  args: {
    threadId: v.id('threads'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get thread info
    const thread = await ctx.runQuery(api.threads.get, {
      threadId: args.threadId,
    })

    const userId = thread.userId
    const projectId = thread.projectId

    // 2. NLP Classification (extract @mentions)
    const classification = await ctx.runAction(
      api.agents.nlpClassifier.classifyMessage,
      {
        userId,
        threadId: args.threadId,
        messageContent: args.content,
      },
    )

    // 3. Build context
    const context = await ctx.runAction(
      api.agents.contextBuilder.buildContext,
      {
        threadId: args.threadId,
        userId,
        projectMentions: classification.projectMentions,
        currentProjectId: projectId,
      },
    )

    // 4. Select model
    const { languageModel, maxTokens, temperature } = selectModel({
      mode: thread.mode,
      intent: classification.intent,
      contextTokenCount: context.tokenCount,
    })

    // 5. Create and run inference agent
    const agent = createInferenceAgent(
      ctx,
      args.threadId,
      projectId,
      userId,
      languageModel,
      thread.mode,
    )

    // Prepare system message with context
    const contextMessage = context.context
      .map((item) => `[${item.source}] ${item.content}`)
      .join('\n\n')

    const result = await agent.run(
      `Context:\n${contextMessage}\n\nUser: ${args.content}\n\nProvide a helpful response.`,
    )

    const assistantMessage = result.text

    // 6. Store messages
    await ctx.runMutation(api.messages.create, {
      threadId: args.threadId,
      userId,
      role: 'user',
      content: args.content,
      createdAt: Date.now(),
    })

    await ctx.runMutation(api.messages.create, {
      threadId: args.threadId,
      userId,
      role: 'assistant',
      content: assistantMessage,
      createdAt: Date.now(),
      metadata: {
        model: languageModel.modelId,
        contextSnapshot: {
          projectId,
          projectMentions: classification.projectMentions.map(
            (m) => m.projectId,
          ),
        },
      },
    })

    // 7. Extract and store memories (async, non-blocking)
    ctx.runAction(api.agents.memoryManager.extractAndStoreMemories, {
      threadId: args.threadId,
      userId,
      projectId,
      userMessage: args.content,
      assistantMessage,
    })

    // 8. Determine banner state
    const bannerState = await ctx.runAction(
      api.agents.uxStateAgent.determineBannerState,
      {
        threadId: args.threadId,
        projectMentions: classification.projectMentions,
        currentProjectId: projectId,
      },
    )

    return {
      assistantMessage,
      model: languageModel.modelId,
      tokenCount: context.tokenCount,
      bannerState,
    }
  },
})
```

---

#### **Agent 5: UX State Agent**

**Responsibility:** Determine whether to show attachment banner and manage UI state.

**Input:**

```typescript
{
  threadId: string,
  projectMentions: Array<{ projectId: string }>,
  currentProjectId?: string
}
```

**Output:**

```typescript
{
  showBanner: boolean,
  bannerProjectId?: string,
  bannerMessage: string
}
```

**Implementation:**

```typescript
// convex/agents/uxStateAgent.ts

import { action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'

export const determineBannerState = action({
  args: {
    threadId: v.id('threads'),
    projectMentions: v.array(
      v.object({
        projectId: v.string(),
        projectName: v.string(),
      }),
    ),
    currentProjectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    // No mentions → no banner
    if (args.projectMentions.length === 0) {
      return { showBanner: false, bannerMessage: '' }
    }

    // Single mention
    if (args.projectMentions.length === 1) {
      const mention = args.projectMentions[0]

      // Already attached to mentioned project → no banner
      if (args.currentProjectId === mention.projectId) {
        return { showBanner: false, bannerMessage: '' }
      }

      // Check if banner was already dismissed for this mention
      const existingMention = await ctx.runQuery(
        api.projectMentions.getByThreadProject,
        {
          threadId: args.threadId,
          projectId: mention.projectId,
        },
      )

      if (
        existingMention &&
        existingMention.attachmentOffered &&
        existingMention.attachmentAccepted === false
      ) {
        return { showBanner: false, bannerMessage: '' }
      }

      // Show banner
      if (!args.currentProjectId) {
        return {
          showBanner: true,
          bannerProjectId: mention.projectId,
          bannerMessage: `Attach this thread to ${mention.projectName}?`,
        }
      } else {
        return {
          showBanner: true,
          bannerProjectId: mention.projectId,
          bannerMessage: `Switch thread to ${mention.projectName}?`,
        }
      }
    }

    // Multiple mentions → show banner for first unattached project
    // (This is a simplification; could be more sophisticated)
    const firstMention = args.projectMentions[0]
    return {
      showBanner: true,
      bannerProjectId: firstMention.projectId,
      bannerMessage: `Multiple projects mentioned. Attach to ${firstMention.projectName}?`,
    }
  },
})
```

---

## 4. Data Flow Architecture

### 4.1 Message Send Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ User types message with @Project mention                        │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: Parse @mentions, highlight in UI                      │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Action: sendMessage(threadId, content)                          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Agent 1: NLP Classifier                                          │
│ → Extract @mentions, validate projects exist                    │
│ → Classify intent                                               │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Agent 2: Context Builder                                         │
│ → Fetch thread history                                          │
│ → Fetch project memory (if attached OR mentioned)               │
│ → Fetch pinned memory                                           │
│ → Rank and truncate                                             │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Agent 3: Model Router                                            │
│ → Select model based on mode + intent + context length          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ LLM Inference (external API call)                               │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Store assistant message with contextSnapshot                    │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Agent 4: Memory Manager                                          │
│ → Extract facts from conversation                               │
│ → Generate embeddings                                           │
│ → Store in memories table                                       │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Agent 5: UX State Agent                                          │
│ → Determine if attachment banner should be shown                │
│ → Store projectMention record                                   │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: Render message + optional banner                      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Thread Attachment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User clicks "Attach" on banner                                   │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Mutation: attachThreadToProject(threadId, projectId)            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Update thread.projectId = projectId                             │
│ Update project.lastActiveAt = now()                             │
│ Update projectMention.attachmentAccepted = true                 │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ Frontend: Sidebar reactively updates (thread moves to project)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Frontend Architecture

### 5.1 Component Structure

```
App
├── Sidebar
│   ├── ProjectList
│   │   ├── ProjectItem
│   │   │   ├── ProjectHeader (name, icon, collapse button, + button)
│   │   │   └── ThreadList
│   │   │       └── ThreadItem
│   │   └── AddProjectButton
│   └── FreeChatsList
│       ├── ThreadItem
│       └── AddChatButton
├── ChatView
│   ├── ChatHeader (project context indicator)
│   ├── MessageList
│   │   ├── MessageItem
│   │   └── AttachmentBanner (conditional)
│   └── InputArea (with @mention autocomplete)
└── ContextProviders
    ├── ProjectsProvider
    ├── ThreadsProvider
    └── ActiveThreadProvider
```

### 5.2 State Management

**Global State (Jotai):**

```typescript
// state/atoms.ts

import { atom } from 'jotai'

export const projectsAtom = atom<Project[]>([])
export const threadsAtom = atom<Thread[]>([])
export const activeThreadIdAtom = atom<string | null>(null)
export const sidebarCollapsedAtom = atom<Record<string, boolean>>({})
```

**React Query Integration:**

```typescript
// hooks/useProjects.ts

import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

export function useProjects() {
  const projects = useQuery(api.projects.listByUser, {
    userId: getCurrentUserId(),
  })

  return projects
}
```

### 5.3 @Mention Autocomplete

```typescript
// components/InputArea.tsx

import { useState, useEffect } from "react";
import { useProjects } from "../hooks/useProjects";

export function InputArea() {
  const [input, setInput] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const projects = useProjects();

  useEffect(() => {
    // Detect @mention trigger
    const cursorPos = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = input.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      setShowAutocomplete(true);
      setAutocompleteQuery(match[1]);
    } else {
      setShowAutocomplete(false);
    }
  }, [input]);

  const filteredProjects = projects?.filter(p =>
    p.name.toLowerCase().includes(autocompleteQuery.toLowerCase())
  );

  return (
    <div className="relative">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        ref={inputRef}
      />
      {showAutocomplete && (
        <AutocompleteMenu
          items={filteredProjects}
          onSelect={(project) => {
            // Replace @query with @ProjectName
            const newInput = input.replace(/@\w*$/, `@${project.name} `);
            setInput(newInput);
            setShowAutocomplete(false);
          }}
        />
      )}
    </div>
  );
}
```

---

## 6. Performance Optimization

### 6.1 Vector Search Optimization

**Strategy:** Use Convex vector index with pre-filtering

```typescript
// Query memories with vector similarity
const relevantMemories = await ctx.db
  .query('memories')
  .withIndex('by_embedding', (q) =>
    q
      .filter((memory) => memory.userId === userId)
      .filter((memory) => memory.scope === 'project')
      .filter((memory) => memory.scopeId === projectId),
  )
  .nearestNeighbors('embedding', queryEmbedding, 10)
```

**Expected Performance:**

- Vector search: <100ms for 100k memories
- Pre-filtering reduces search space by 99%

### 6.2 Context Caching

**Strategy:** Cache computed context for 5 minutes

```typescript
// Implement in Context Builder Agent
const cacheKey = `context:${threadId}:${projectId}:${lastMessageId}`
const cached = await ctx.storage.get(cacheKey)

if (cached) {
  return cached
}

const context = await buildContext(/* ... */)
await ctx.storage.set(cacheKey, context, { ttl: 300 })
return context
```

### 6.3 Sidebar Virtualization

**Strategy:** Use `react-window` for large project/thread lists

```typescript
import { FixedSizeList } from "react-window";

<FixedSizeList
  height={600}
  itemCount={projects.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <ProjectItem style={style} project={projects[index]} />
  )}
</FixedSizeList>
```

---

## 7. Memory Ranking Algorithm

### 7.1 Ranking Function

```typescript
function rankMemory(memory: Memory, query: string): number {
  const now = Date.now()

  // Relevance (cosine similarity from vector search)
  const relevance = memory.relevanceScore // 0-1

  // Recency (exponential decay)
  const ageInDays = (now - memory.createdAt) / (1000 * 60 * 60 * 24)
  const recency = Math.exp(-ageInDays / 30) // Half-life of 30 days

  // Importance (user-set or LLM-computed)
  const importance = memory.importanceScore // 0-1

  // Weighted sum
  const α = 0.5 // Relevance weight
  const β = 0.3 // Recency weight
  const γ = 0.2 // Importance weight

  return α * relevance + β * recency + γ * importance
}
```

### 7.2 Memory Summarization

**Strategy:** Periodically summarize old project memories to reduce token usage

```typescript
// Scheduled function (runs weekly)
export const summarizeOldMemories = internalMutation({
  handler: async (ctx) => {
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    const oldMemories = await ctx.db
      .query('memories')
      .filter((q) => q.lt(q.field('createdAt'), oneMonthAgo))
      .filter((q) => q.eq(q.field('scope'), 'project'))
      .collect()

    // Group by project
    const byProject = groupBy(oldMemories, (m) => m.scopeId)

    for (const [projectId, memories] of Object.entries(byProject)) {
      // Use LLM to generate summary
      const summary = await summarizeMemories(memories)

      // Create new summary memory
      await ctx.db.insert('memories', {
        userId: memories[0].userId,
        scope: 'project',
        scopeId: projectId,
        content: summary,
        embedding: await generateEmbedding(summary),
        importanceScore: 0.8,
        recencyScore: 1.0,
        metadata: { source: 'system', tags: ['summary'] },
      })

      // Archive old memories (don't delete)
      for (const memory of memories) {
        await ctx.db.patch(memory._id, {
          metadata: { ...memory.metadata, archived: true },
        })
      }
    }
  },
})
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Core data layer and basic UI

**Tasks:**

- Implement Convex schema (projects, threads, memories, projectMentions)
- Migration script for existing chats → threads
- Basic sidebar with project/thread hierarchy
- Project CRUD operations (create, rename, archive)
- Thread attachment mutation

**Deliverables:**

- Schema deployed to production
- Sidebar renders projects and threads
- Users can create projects and attach threads manually

---

### Phase 2: Context Pipeline (Weeks 3-4)

**Goal:** @Mention detection and context injection

**Tasks:**

- Implement NLP Classifier Agent (@mention extraction)
- Implement Context Builder Agent (memory retrieval + ranking)
- Implement Model Router Agent
- Frontend @mention autocomplete
- Message send pipeline integration

**Deliverables:**

- @Mention autocomplete works in input
- Typing @Project injects project memory into context
- AI responses reflect project context

---

### Phase 3: Memory System (Week 5)

**Goal:** Automated memory extraction and storage

**Tasks:**

- Implement Memory Manager Agent
- LLM-based fact extraction
- Embedding generation pipeline
- Memory ranking algorithm
- Memory display in UI (optional debug view)

**Deliverables:**

- Memories are automatically extracted from conversations
- Memories are retrieved and ranked correctly
- Memory system passes accuracy tests (>95%)

---

### Phase 4: UX Polish (Week 6)

**Goal:** Attachment banners, drag-and-drop, edge cases

**Tasks:**

- Implement UX State Agent
- Attachment banner UI component
- Banner state management (show/dismiss logic)
- Drag-and-drop thread reassignment (optional)
- Edge case handling (archived projects, concurrent edits)

**Deliverables:**

- Attachment banner appears after @mention responses
- Users can attach threads via banner
- All edge cases handled gracefully

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Test Coverage:**

- Agent logic (NLP classifier, context builder, memory manager)
- Memory ranking function
- @Mention regex parsing
- Context truncation algorithm

**Example Test:**

```typescript
// agents/contextBuilder.test.ts

describe('Context Builder Agent', () => {
  it('should rank project memory higher than profile memory', async () => {
    const context = await buildContext({
      threadId: 'thread1',
      userId: 'user1',
      projectId: 'project1',
      projectMentions: [],
    })

    const projectMemories = context.filter((c) =>
      c.source.startsWith('project'),
    )
    const profileMemories = context.filter((c) => c.source === 'profile')

    expect(projectMemories[0].rank).toBeGreaterThan(profileMemories[0].rank)
  })
})
```

### 9.2 Integration Tests

**Test Scenarios:**

- User sends message with @Project → context includes project memory
- User attaches thread to project → sidebar updates
- User archives project → project no longer appears in autocomplete

### 9.3 E2E Tests

**User Flows:**

1. Create project → Create thread in project → Send message → Verify context
2. Send message with @Project in free chat → Verify banner appears → Click "Attach" → Verify thread moves
3. Type @P → Verify autocomplete shows projects starting with "P"

---

## 10. Monitoring and Observability

### 10.1 Metrics

**Key Metrics:**

- Context build latency (p50, p99)
- Memory retrieval latency (p50, p99)
- @Mention detection accuracy
- Attachment banner conversion rate (% of banners that result in attachment)
- Project-thread ratio (avg threads per project)

**Implementation:**

```typescript
// Use Convex analytics or external service (e.g., PostHog)
await trackEvent('context_built', {
  latency: buildTime,
  tokenCount: context.tokenCount,
  sources: context.sources,
})
```

### 10.2 Error Handling

**Error Categories:**

1. **User Errors:** Invalid project name, archived project mention
2. **System Errors:** Context build failure, memory retrieval timeout
3. **Data Errors:** Corrupted embeddings, missing project references

**Strategy:**

- User errors → Display friendly error message
- System errors → Log to monitoring, fallback to thread-only context
- Data errors → Trigger alert, auto-repair if possible

---

## 11. Security and Privacy

### 11.1 Data Isolation

**Rule:** Users can only access their own projects, threads, and memories.

**Enforcement:**

```typescript
// All queries must filter by userId
export const listProjects = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity?.subject !== args.userId) {
      throw new Error('Unauthorized')
    }

    return await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
  },
})
```

### 11.2 Memory Sanitization

**Rule:** Do not store PII or secrets in memories.

**Implementation:**

- LLM-based PII detection before storing memory
- Redact detected PII (emails, phone numbers, API keys)

---

## 12. Rollout Strategy

### 12.1 Feature Flags

**Flags:**

- `enable_projects`: Enable project creation UI
- `enable_context_injection`: Enable @mention-based context injection
- `enable_memory_extraction`: Enable automatic memory extraction
- `enable_attachment_banners`: Enable attachment banners

**Rollout Plan:**

1. Week 1-2: Deploy schema, enable `enable_projects` for internal users
2. Week 3-4: Enable `enable_context_injection` for 10% of users
3. Week 5: Enable `enable_memory_extraction` for 50% of users
4. Week 6: Enable all flags for 100% of users

### 12.2 Backward Compatibility

**Strategy:**

- Existing users see "Chats" section with all threads (no projects)
- Users can opt-in to create first project
- Migration script runs in background to populate `threads` table

---

## 13. Open Questions

1. **Should we allow cross-project memory retrieval?**
   - Pros: More flexible context, better for related projects
   - Cons: Increases complexity, may cause context pollution

2. **How should we handle project deletion?**
   - Option A: Soft delete (archive) only
   - Option B: Hard delete with cascade to memories (requires confirmation)

3. **Should project memory be editable by users?**
   - Pros: User control, error correction
   - Cons: Complexity, risk of manual corruption

4. **What is the optimal memory ranking weight configuration?**
   - Needs A/B testing to determine α, β, γ values

---

## 14. Technical Debt Considerations

**Known Limitations (to be addressed post-MVP):**

- Memory summarization not implemented in Phase 1-4
- Vector search uses basic cosine similarity (no learned re-ranking)
- @Mention autocomplete does not support fuzzy matching
- Sidebar does not support custom project ordering

**Mitigation:**

- Document all limitations in `progress.txt`
- Create follow-up tickets for each item
- Prioritize based on user feedback

---

**End of Technical Plan**
