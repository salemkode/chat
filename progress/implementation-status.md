# Convex Vector DB & Agent Implementation Status

## What Was Completed ✅

1. **Added Context7 MCP**
   - Configured Context7 MCP server in opencode.json
   - API key: ctx7sk-80f76c1f-94cb-4da2-af61-8f599b3cd795

2. **Fetched Documentation**
   - Convex Actions API
   - Convex Vector Search API
   - Convex Agents & Tools API
   - Convex Context Management

3. **Schema Analysis**
   - Verified userMemories, threadMemories, projectMemories tables exist
   - Vector indexes already defined with 1536 dimensions
   - Filter fields configured for efficient queries

4. **Memory Functions Started**
   - Created write functions: createUserMemory, createThreadMemory, createProjectMemory
   - Created read functions: listUserMemories, listThreadMemories
   - Created project functions: createProject, listProjects, addThreadToProject
   - Created update/delete functions: updateMemory, deleteMemory

5. **Internal Query Functions**
   - Added memoryInternal.ts with:
     - getUserMemoriesByIds, getThreadMemoriesByIds, getProjectMemoriesByIds
     - getMemoryById helper

## Current Issues ⚠️

### 1. Vector Search Implementation Issue

The searchMemory action was being rewritten to use Convex's built-in vector search, but encountered TypeScript errors due to:

- Circular dependency: `getMemoryById` defined in same file needs to be referenced via generated API
- Filter syntax: Vector search filters need correct Convex API syntax
- Internal function reference: Functions in same module need proper internal reference

### 2. memorySearch.ts Has Issues

- Using old schema field names (chunks_vec vs by_embedding)
- Field name mismatches (path, start_line, end_line vs path, startLine, endLine)

## Next Steps 🔧

### Immediate (To Fix Current Issues)

1. **Fix Vector Search** (Option A - Simple approach first)

   ```bash
   # Temporarily use simple text search
   # Test basic memory operations work
   # Then add vector search
   ```

2. **Or Fix Vector Search** (Option B - Direct approach)
   - Use direct approach without internal queries
   - Just iterate through vector search results and fetch directly
   - Simplify filter syntax

### After Vector Search Works

3. **Create Agent Tools**
   In `convex/agents.ts` add:

   ```typescript
   import { createTool } from '@convex-dev/agent/tools'
   import { z } from 'zod'

   const memorySearchTool = createTool({
     description: 'Search for relevant memories',
     args: z.object({
       query: z.string().describe('Search query'),
       scope: z.optional(z.enum(['user', 'thread', 'project', 'all'])),
       limit: z.optional(z.number()),
     }),
     handler: async (ctx, args, options) => {
       return await ctx.runQuery(api.memory.searchMemory, {
         query: args.query,
         scope: args.scope,
         maxResults: args.limit ?? 5,
       })
     },
   })

   const memoryWriteTool = createTool({
     description: 'Store information in memory',
     args: z.object({
       title: z.string().describe('Memory title'),
       content: z.string().describe('Memory content'),
       scope: z.enum(['user', 'thread', 'project']).describe('Memory scope'),
       category: z.optional(z.string()).describe('Memory category'),
     }),
     handler: async (ctx, args, options) => {
       const scope = args.scope as 'user' | 'thread' | 'project'
       if (scope === 'user') {
         return await ctx.runQuery(api.memory.createUserMemory, {
           title: args.title,
           content: args.content,
           category: args.category,
           source: 'manual',
         })
       }
     },
   })
   ```

4. **Add Tools to Agent**

   ```typescript
   export const chatAgent = new Agent(components.agent, {
     name: 'chat',
     languageModel: openrouter.chat('mistralai/devstral-2512:free'),
     instructions: 'You are a helpful assistant with access to memory.',
     tools: {
       memory_search: memorySearchTool,
       memory_write: memoryWriteTool,
     },
   })
   ```

5. **Add Auto-Context Injection**

   ```typescript
   export const chatAgent = new Agent(components.agent, {
     // ... other options
     contextHandler: async (ctx, args) => {
       // Fetch relevant memories based on prompt
       const memories = await fetchRelevantMemories(ctx, {
         query: args.inputMessages[0].content,
         userId: args.userId,
         threadId: args.threadId,
         limit: 3,
       })

       // Add memories to context
       const memoryContext = memories.map((m) => ({
         role: 'system',
         content: `Memory: ${m.title} - ${m.content}`,
       }))

       return [
         ...memoryContext,
         ...args.search,
         ...args.recent,
         ...args.inputMessages,
         ...args.inputPrompt,
         ...args.existingResponses,
       ]
     },
   })
   ```

6. **Regenerate Types & Deploy**

   ```bash
   npx convex dev --once
   npx convex deploy
   ```

7. **Update Progress Tracking**
   - Mark steps 3-5 as complete
   - Add step 8 (agent tools) status
   - Update IMPLEMENTATION-SUMMARY.md

## Implementation Priority

1. **Fix vector search** - Blocker for advanced search
2. **Test basic CRUD** - Ensure basic operations work
3. **Create agent tools** - Add memory tools for agent
4. **Auto-context injection** - Make memories available automatically
5. **Create UI components** - Phase 4 tasks
6. **Testing & Polish** - Phase 5 tasks

## Key Learnings from Docs

### Convex Vector Search

- Vector search is only available in **actions** (not queries/mutations)
- Uses `ctx.vectorSearch(table, index, { vector, limit, filter })`
- Returns array of `{ _id, _score }` - no document data
- Must fetch documents separately via queries/mutations
- Filters use `filter: (q) => q.eq('field', value)` syntax
- Only ONE filter field can be chained directly in filter
- For multiple fields, use separate indices or filter after fetching

### Convex Agents

- Tools created with `createTool()` from `@convex-dev/agent/tools`
- Tools have access to `ctx` with agent, userId, threadId, messageId
- ContextHandler allows full control over messages passed to LLM
- Can fetch context with `fetchContextWithPrompt()`
- Auto-manages message history, embeddings, streaming

### Convex Actions

- Can call third-party APIs (like OpenAI embeddings)
- Use `ctx.runQuery()` and `ctx.runMutation()` for DB access
- No direct `ctx.db` access in actions
- Use internal functions for helpers not exposed to clients
