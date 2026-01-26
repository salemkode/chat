# Agent Base Integration Plan

## Overview

This plan details the integration of the `@convex-dev/agent` component (located at `agent_base/`) into the main Convex backend. The agent component will no longer be used as an external dependency but will be merged directly into our backend logic.

## Current State Analysis

### Agent Base Component Structure
The `@convex-dev/agent` package provides:

1. **Backend Schema** (`agent_base/src/component/schema.ts`):
   - `threads`: Thread management with userId, title, summary, status
   - `messages`: Complex message structure with embeddings, streaming, tools
   - `streamingMessages`: Real-time streaming state
   - `streamDeltas`: Chunked streaming data
   - `memories`: User/thread context with vector embeddings
   - `files`: File storage with reference counting
   - `apiKeys`: Playground authentication

2. **Backend Functions** (`agent_base/src/component/`):
   - `threads.ts`: Thread CRUD, search, deletion
   - `messages.ts`: Message management, search, embeddings
   - `users.ts`: User data management and cleanup
   - `streams.ts`: Streaming message handling
   - `files.ts`: File upload and storage
   - `vector/`: Vector search capabilities

3. **Client API** (`agent_base/src/client/`):
   - `Agent` class with methods: createThread, continueThread, generateText, streamText, generateObject, streamObject
   - Message serialization and utilities
   - Search functionality

4. **React Hooks** (`agent_base/src/react/`):
   - `useThreadMessages`, `useStreamingThreadMessages`
   - `useUIMessages`, `useStreamingUIMessages`
   - `useSmoothText`, `optimisticallySendMessage`

### Current Backend Structure
Our current backend (`convex/`):

1. **Schema**:
   - `messages`: Simple messages (body, userId, role)
   - `models`: AI model configuration
   - `admins`: Admin user management
   - `sections`: Thread folders/organization
   - `threadMetadata`: Links threads to sections with emoji

2. **Functions**:
   - `chat.ts`: Uses agent component for threads/messages
   - `messages.ts`: Basic message operations
   - `users.ts`: User viewer
   - `sections.ts`: Section/folder management
   - `admin.ts`: Model administration
   - `auth.ts`: Password authentication

## Integration Strategy

### Phase 1: Schema Migration

#### 1.1 Merge Threads Table
```typescript
threads: defineTable({
  // From agent_base
  userId: v.optional(v.id('users')), // Changed: now references users table
  title: v.optional(v.string()),
  summary: v.optional(v.string()),
  status: v.union(v.literal('active'), v.literal('archived')),

  // NEW: Integration with our sections
  sectionId: v.optional(v.id('sections')),
  emoji: v.optional(v.string()),

  // DEPRECATED from agent_base
  defaultSystemPrompt: v.optional(v.string()),
  parentThreadIds: v.optional(v.array(v.id('threads'))),
  order: v.optional(v.number()),
})
  .index('by_userId', ['userId'])
  .index('by_sectionId', ['sectionId'])
  .searchIndex('title', { searchField: 'title', filterFields: ['userId'] })
```

**Key Changes**:
- `userId` now references our `users` table instead of optional string
- Added `sectionId` to link with our sections system
- Added `emoji` for thread icons (from threadMetadata)
- Kept `status` but only use 'active' and 'archived'

#### 1.2 Merge Messages Table
```typescript
messages: defineTable({
  // From agent_base
  userId: v.optional(v.id('users')), // Changed: references users table
  threadId: v.id('threads'),
  order: v.number(),
  stepOrder: v.number(),
  embeddingId: v.optional(v.id('vMessages1536')),
  fileIds: v.optional(v.array(v.id('files'))),
  error: v.optional(v.string()),
  status: v.union(v.literal('pending'), v.literal('success'), v.literal('failed')),

  // Context on how it was generated
  agentName: v.optional(v.string()),
  model: v.optional(v.string()),
  provider: v.optional(v.string()),
  providerOptions: v.optional(v.any()), // From validators

  // The result
  message: v.optional(v.any()), // vMessage from validators
  tool: v.boolean(),
  text: v.optional(v.string()),

  // Result metadata
  usage: v.optional(v.any()), // vUsage from validators
  providerMetadata: v.optional(v.any()), // vProviderMetadata
  sources: v.optional(v.array(v.any())), // vSource
  warnings: v.optional(v.array(v.any())), // vLanguageModelCallWarning
  finishReason: v.optional(v.any()), // vFinishReason
  reasoning: v.optional(v.string()),
  reasoningDetails: v.optional(v.any()), // vReasoningDetails

  // DEPRECATED
  id: v.optional(v.string()),
  parentMessageId: v.optional(v.id('messages')),
  stepId: v.optional(v.string()),
  files: v.optional(v.array(v.any())),
})
  .index('threadId_status_tool_order_stepOrder', ['threadId', 'status', 'tool', 'order', 'stepOrder'])
  .searchIndex('text_search', { searchField: 'text', filterFields: ['userId', 'threadId'] })
  .index('embeddingId_threadId', ['embeddingId', 'threadId'])
```

**Key Changes**:
- `userId` now references our `users` table
- `embeddingId` references our vector tables
- `fileIds` references our files table
- Kept all complex message structure from agent_base

#### 1.3 Add Streaming Support
```typescript
streamingMessages: defineTable({
  userId: v.optional(v.id('users')),
  agentName: v.optional(v.string()),
  model: v.optional(v.string()),
  provider: v.optional(v.string()),
  providerOptions: v.optional(v.any()),
  format: v.optional(v.union(v.literal('UIMessageChunk'), v.literal('TextStreamPart'))),
  threadId: v.id('threads'),
  order: v.number(),
  stepOrder: v.number(),
  state: v.union(
    v.object({ kind: v.literal('streaming'), lastHeartbeat: v.number(), timeoutFnId: v.optional(v.id('_scheduled_functions')) }),
    v.object({ kind: v.literal('finished'), endedAt: v.number(), cleanupFnId: v.optional(v.id('_scheduled_functions')) }),
    v.object({ kind: v.literal('aborted'), reason: v.string() })
  ),
})
  .index('threadId_state_order_stepOrder', ['threadId', 'state.kind', 'order', 'stepOrder'])

streamDeltas: defineTable({
  streamId: v.id('streamingMessages'),
  start: v.number(),
  end: v.number(),
  parts: v.array(v.any()),
})
  .index('streamId_start_end', ['streamId', 'start', 'end'])
```

#### 1.4 Add Files Table
```typescript
files: defineTable({
  storageId: v.string(),
  mimeType: v.string(),
  filename: v.optional(v.string()),
  hash: v.string(),
  refcount: v.number(),
  lastTouchedAt: v.number(),
})
  .index('hash', ['hash'])
  .index('refcount', ['refcount'])
```

#### 1.5 Add Memories Table (Optional - for RAG)
```typescript
memories: defineTable({
  threadId: v.optional(v.id('threads')),
  userId: v.optional(v.id('users')),
  memory: v.string(),
  embeddingId: v.optional(v.id('vMemories1536')),
})
  .index('threadId', ['threadId'])
  .index('userId', ['userId'])
  .index('embeddingId', ['embeddingId'])
```

#### 1.6 Keep Existing Tables
```typescript
// Keep as-is
models: defineTable({
  modelId: v.string(),
  displayName: v.string(),
  isEnabled: v.boolean(),
  isFree: v.boolean(),
  sortOrder: v.number(),
})
  .index('by_enabled', ['isEnabled'])

admins: defineTable({
  userId: v.id('users'),
})
  .index('by_userId', ['userId'])

sections: defineTable({
  name: v.string(),
  emoji: v.string(),
  sortOrder: v.number(),
  userId: v.id('users'),
  isExpanded: v.boolean(),
})
  .index('by_userId', ['userId'])
```

#### 1.7 Remove Deprecated Table
```typescript
// DELETE: threadMetadata - functionality moved to threads table
```

### Phase 2: Backend Function Migration

#### 2.1 Copy Core Functions
Copy from `agent_base/src/component/` to `convex/`:

1. **threads.ts** → `convex/agent/threads.ts`:
   - getThread, listThreadsByUserId, createThread, updateThread
   - searchThreadTitles, deleteAllForThreadIdSync, deleteAllForThreadIdAsync

2. **messages.ts** → `convex/agent/messages.ts`:
   - listMessagesByThreadId, addMessages, updateMessage, finalizeMessage
   - searchMessages, textSearch, getMessageSearchFields
   - deleteByIds, deleteByOrder

3. **streams.ts** → `convex/agent/streams.ts`:
   - All streaming-related functions

4. **files.ts** → `convex/agent/files.ts`:
   - getFile, storeFile, changeRefcount

5. **vector/** → `convex/agent/vector/`:
   - Vector search tables and functions

6. **users.ts** → `convex/agent/users.ts`:
   - User cleanup functions

#### 2.2 Create New Agent Functions
Create `convex/agent/index.ts` with:

1. **Agent configuration**
2. **Thread management functions**
3. **Message generation functions**
4. **Search and context functions**

#### 2.3 Update Existing Functions

1. **chat.ts**:
   - Remove dependency on `@convex-dev/agent` components
   - Use local functions instead
   - Update to use new schema

2. **messages.ts**:
   - Can be deleted - functionality moved to agent/messages.ts
   - Or keep as simple wrapper for backward compatibility

3. **sections.ts**:
   - Update to work with new threads schema (threads now have sectionId)
   - Add functions to move threads between sections

4. **admin.ts**:
   - Keep as-is, works with models table

### Phase 3: Frontend Migration

#### 3.1 Copy React Hooks
Copy from `agent_base/src/react/` to `src/hooks/agent/`:

1. **useThreadMessages.ts**: Thread message querying
2. **useStreamingThreadMessages.ts**: Real-time message streaming
3. **useUIMessages.ts**: UI message management
4. **useStreamingUIMessages.ts**: Streaming UI messages
5. **useSmoothText.ts**: Smooth text rendering
6. **optimisticallySendMessage.ts**: Optimistic UI updates

#### 3.2 Copy Client Utilities
Copy from `agent_base/src/client/` to `src/lib/agent/`:

1. **index.ts**: Main Agent client class (adapt for our backend)
2. **messages.ts**: Message utilities
3. **threads.ts**: Thread utilities
4. **search.ts**: Search utilities
5. **files.ts**: File handling
6. **streaming.ts**: Streaming utilities

#### 3.3 Update Routes

1. **chat.$chatId.tsx**:
   - Use new hooks from `src/hooks/agent/`
   - Update to work with new schema

2. **chat.index.tsx**:
   - Update thread listing to use new structure
   - Integrate with sections

### Phase 4: Dependencies

#### 4.1 Package Updates
```json
{
  "dependencies": {
    // Keep existing
    "@convex-dev/auth": "^0.0.90",
    "convex": "^1.31.5",
    "ai": "^6.0.39",
    "convex-helpers": "^0.1.111",

    // Can REMOVE after migration
    // "@convex-dev/agent": "^0.3.2",  <- REMOVE THIS

    // May need to ADD
    "@ai-sdk/provider": "^2.0.0",
    "@ai-sdk/provider-utils": "^4.0.8"
  }
}
```

#### 4.2 Convex Config
Update `convex/convex.config.ts` to remove agent component reference:
```typescript
// BEFORE
import components from '@convex-dev/agent/convex.config'
export default defineConfig({
  components,
  // ...
})

// AFTER
export default defineConfig({
  // No components reference
  // ...
})
```

### Phase 5: Data Migration

#### 5.1 Migration Script
Create `convex/migrations/mergeAgent.ts`:

1. Migrate existing threads from agent component to main schema
2. Migrate existing messages
3. Migrate threadMetadata to threads table (add emoji, sectionId)
4. Create indexes
5. Delete old agent component data

#### 5.2 Validation
Create validation queries to ensure data integrity

## Implementation Order

1. **Schema First**: Update schema.ts with all new tables
2. **Backend Functions**: Copy and adapt agent functions
3. **Frontend Hooks**: Copy React hooks to src/
4. **Client Utilities**: Copy client code to src/lib/
5. **Update Routes**: Modify routes to use new hooks
6. **Remove Dependency**: Remove @convex-dev/agent from package.json
7. **Test**: Thoroughly test all functionality
8. **Data Migration**: Migrate any existing data

## Breaking Changes

1. **Thread IDs**: Thread IDs will change (string → id('threads'))
2. **Message Structure**: Messages are now much more complex
3. **User References**: userId is now id('users') not string
4. **Thread Metadata**: threadMetadata table is gone, data moved to threads
5. **API Changes**: All chat functions will have different signatures

## Rollback Plan

1. Keep `@convex-dev/agent` in package.json but commented out
2. Create backup of current convex/ schema and functions
3. Use Convex deployments to test in dev environment first
4. Keep old functions in place during migration, mark as @deprecated
5. Only remove old code after thorough testing

## Testing Strategy

1. **Unit Tests**: Test all migrated functions
2. **Integration Tests**: Test agent workflows (create, chat, delete)
3. **Frontend Tests**: Test all hooks and UI components
4. **E2E Tests**: Test complete user flows
5. **Load Tests**: Test with large number of messages/threads

## Success Criteria

1. ✅ All agent_base functionality working in main backend
2. ✅ Frontend using new hooks without @convex-dev/agent dependency
3. ✅ Data migrated successfully
4. ✅ All tests passing
5. ✅ Performance not degraded
6. ✅ User ownership working correctly (userId on threads/messages)
