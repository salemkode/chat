# TypeScript Error Fix Plan

## Overview
43 TypeScript errors need to be fixed across 7 files. This plan addresses all errors systematically.

## Root Causes
1. **Missing schema import** - `paginator` and `stream` utilities require schema
2. **threadMetadata table commented out** - Code references it but it's disabled
3. **streamDeltas structure mismatch** - Code uses different structure than schema
4. **Missing indexes** - Several indexes referenced in code but not in schema
5. **Function reference issues** - Registered mutations need proper handling for scheduling
6. **Type mismatches** - Various type annotation issues

---

## Phase 1: Schema Fixes (Foundation)

### 1.1 Uncomment and Fix threadMetadata Table
**File:** `convex/schema.ts`
**Lines:** 223-231

**Action:** Uncomment the threadMetadata table definition

**Why:** Code in `agents.ts` queries this table

```typescript
threadMetadata: defineTable({
  threadId: v.string(), // ID from agent threads
  emoji: v.string(),
  title: v.optional(v.string()),
  summary: v.optional(v.string()),
  sectionId: v.optional(v.id('sections')),
  userId: v.id('users'),
  mode: v.optional(v.union(
    v.literal('code'),
    v.literal('learn'),
    v.literal('think'),
    v.literal('create')
  )),
  createdAt: v.number(),
  lastActiveAt: v.number(),
  isPinned: v.optional(v.boolean()),
  messageCount: v.optional(v.number()),
})
  .index('by_userId', ['userId'])
  .index('by_sectionId', ['sectionId'])
  .index('by_threadId', ['threadId']),
```

---

### 1.2 Add Missing Indexes
**File:** `convex/schema.ts`

**Add to messages table (after line 106):**
```typescript
.index('by_userId', ['userId'])
```

**Why:** Code in `messages.ts:14` queries with this index

---

### 1.3 Export Schema for Utilities
**File:** `convex/schema.ts`

**Add at the end of file:**
```typescript
// Export for use with convex-helpers utilities
export const schemaDefinition = {
  threads,
  messages,
  streamingMessages,
  streamDeltas,
  memories,
  files,
  models,
  admins,
  sections,
  threadMetadata,
  ...vectorTables,
}
```

---

## Phase 2: Import and Utility Fixes

### 2.1 Fix Import Paths in streams.ts
**File:** `convex/agent/streams.ts`

**Change line 48:**
```typescript
// OLD (incorrect - args.streamId is Id<"streams">)
const stream = await ctx.db.get("streamingMessages", args.streamId);

// NEW (correct - but we need to fix the validator first)
// See Phase 3.1 for the fix
```

---

### 2.2 Add Schema Import to Files Using paginator/stream
**Files affected:**
- `convex/agent/files.ts`
- `convex/agent/messages.ts`
- `convex/agent/threads.ts`
- `convex/agent/streams.ts`

**Add to each file:**
```typescript
import schemaDefinition from "../schema.js";
```

**Then update all `paginator` and `stream` calls:**
```typescript
// OLD
const threads = await paginator(ctx.db)

// NEW
const threads = await paginator(ctx.db, schemaDefinition)

// OLD
stream(ctx.db)

// NEW
stream(ctx.db, schemaDefinition)
```

---

## Phase 3: Stream Structure Fixes

### 3.1 Fix streamDeltas Validator and Args
**File:** `convex/agent/streams.ts`

**Replace lines 42-47 (deltaValidator):**
```typescript
// OLD (wrong structure)
const deltaValidator = v.object({
  streamId: v.id("streams"),
  order: v.number(),
  delta: v.optional(v.string()),
  deltaType: v.string(),
});

// NEW (matches schema)
const deltaValidator = v.object({
  streamId: v.id("streamingMessages"),
  start: v.number(),
  end: v.number(),
  parts: v.array(v.any()),
});
```

**Then fix the `addDelta` mutation (lines 44-57):**
```typescript
export const addDelta = mutation({
  args: deltaValidator,
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const stream = await ctx.db.get("streamingMessages", args.streamId);
    if (!stream) {
      console.warn("Stream not found", args.streamId);
      return false;
    }
    if (stream.state.kind !== "streaming") {
      return false;
    }
    await ctx.db.insert("streamDeltas", args);
    await heartbeatStream(ctx, { streamId: args.streamId });
    return true;
  },
});
```

---

### 3.2 Fix timeoutStream Function Signature
**File:** `convex/agent/streams.ts`
**Lines:** 297-329

**Fix the argument type:**
```typescript
// OLD
export const timeoutStream = internalMutation({
  args: { streamId: v.id("streamingMessages") },
  // ...
});

// NEW (already correct, but the error is from the scheduler call)
// Keep as is
```

**Fix the scheduler calls (lines 118, 279, 324, 444, 478):**
```typescript
// OLD - passing the function directly
await ctx.scheduler.runAfter(TIMEOUT_INTERVAL, timeoutStream, { streamId });

// NEW - use the function reference
await ctx.scheduler.runAfter(
  TIMEOUT_INTERVAL,
  internalMutation(timeoutStream),
  { streamId }
)
```

**OR better approach - just keep the function reference:**
```typescript
// The actual fix is to NOT pass the registered mutation directly
// Instead, Convex expects a different format. See below.
```

**PROPER FIX for scheduler calls:**
Actually, the error is that we need to use the internal function properly.
The fix is to keep using `internal.agent.streams.timeoutStream` pattern
but we need to recreate the internal namespace.

**Add at the bottom of streams.ts:**
```typescript
// Export internal namespace for scheduling
export const internal = {
  agent: {
    streams: {
      timeoutStream,
      deleteStreamAsync: deleteStreamsPageForThreadIdMutation,
      deleteAllStreamsForThreadIdAsync: deleteAllStreamsForThreadIdAsync,
    }
  }
}
```

---

### 3.3 Fix heartbeatStream and Helper Functions
**File:** `convex/agent/streams.ts`

**Fix line 145 (missing schema):**
```typescript
// OLD
stream(ctx.db, schema)

// NEW
stream(ctx.db, schemaDefinition)
```

**Fix line 164 (streamId property):**
```typescript
// OLD
return {
  streamId: m._id,
  // ...
}

// NEW (streamId is _id for streamingMessages)
return {
  streamId: m._id,
  // No need to add streamId separately, it's the _id
}
```

---

## Phase 4: Messages and Threads Fixes

### 4.1 Fix Messages Query Index Usage
**File:** `convex/agent/messages.ts`
**Line:** 123

**The error is about `.eq("status", "success")` not existing on IndexRange**

**Fix the query:**
```typescript
// OLD (line 118-124)
const messages = await paginator(ctx.db)
  .query("messages")
  .withIndex("by_userId", (q) => q.eq("userId", userId))
  .filter((q) => q.eq("status", "success"))
  .order("desc")
  .paginate(args.paginationOpts)

// NEW (filter after pagination)
const messages = await paginator(ctx.db, schemaDefinition)
  .query("messages")
  .withIndex("threadId_status_tool_order_stepOrder")
  .order("desc")
  .paginate(args.paginationOpts)

// Then filter in the handler
const filteredMessages = messages.page.filter(m => m.status === "success")
```

**Actually, looking at the schema, we need to use the correct index:**
```typescript
// The index 'threadId_status_tool_order_stepOrder' requires threadId
// We need to change the query structure entirely

const messages = await ctx.db
  .query("messages")
  .withIndex("threadId_status_tool_order_stepOrder", (q) =>
    q.eq("threadId", threadId) // Need threadId in args
     .eq("status", "success")
  )
  .collect()
```

---

### 4.2 Fix Message Role Type Issue
**File:** `convex/agent/messages.ts`
**Line:** 275

**Error:** Comparison with "tool" type fails because role is "system" | "user" | "assistant"

**Fix:**
```typescript
// OLD
tool: message.role === "tool",

// NEW (tool is determined by the tool field in schema)
tool: message.tool, // This is already a boolean field
```

---

## Phase 5: Agent Function Fixes

### 5.1 Fix Function References for Scheduling
**File:** `convex/agents.ts`

**Lines 66, 91 - Function reference errors**

**Fix:**
```typescript
// OLD (line 66)
await ctx.runMutation(saveMessage, {
  threadId: args.threadId,
  content: args.content,
  role: args.role,
})

// NEW
import { saveMessage } from "./agent/messages.js";
await saveMessage(ctx, {
  threadId: args.threadId,
  content: args.content,
  role: args.role,
})
```

**And for createThread (line 91):**
```typescript
// OLD
const threadId = await localCreateThread(ctx, {
  title: args.title,
  sectionId: args.sectionId,
  emoji: args.emoji,
})

// NEW
import { createThread as createThreadFn } from "./agent/functions.js";
const threadId = await createThreadFn(ctx, {
  title: args.title,
  sectionId: args.sectionId,
  emoji: args.emoji,
})
```

---

### 5.2 Fix threadMetadata Query and Patch
**File:** `convex/agents.ts`
**Lines 114-122, 146-147

**These will be fixed automatically when we uncomment threadMetadata table in Phase 1.1**

---

## Phase 6: Chat.ts Fixes

### 6.1 Fix Function References
**File:** `convex/chat.ts`
**Lines:** 12, 31, 54, 67

**Pattern is the same as 5.1 - call functions directly instead of using ctx.runQuery/runMutation:**

```typescript
// OLD (line 12)
return await ctx.runQuery(listThreadsAgent, args)

// NEW
import { listThreads } from "./agent/threads.js";
return await listThreads(ctx, args)
```

**Repeat similar pattern for lines 31, 54, 67**

---

## Phase 7: Fix Message Body Field

### 7.1 Fix Message Body Reference
**File:** `convex/messages.ts`
**Line:** 29

**Error:** 'body' does not exist on type

**Fix:**
```typescript
// OLD
body: args.body,

// NEW (messages table uses 'text' field)
text: args.body,
```

---

## Phase 8: Type Annotation Fixes

### 8.1 Fix Implicit Any Types
**File:** `convex/agent/streams.ts`
**Lines:** 565-566

**Fix:**
```typescript
// OLD
.filter((m) => m.message !== undefined)
.map(async (msg) => {

// NEW
.filter((m: any) => m.message !== undefined)
.map(async (msg: any) => {
```

**Better - add proper types:**
```typescript
import type { Doc } from "../_generated/dataModel.js";

.filter((m: Doc<"streamDeltas">) => m.parts !== undefined)
.map(async (msg: Doc<"streamDeltas">) => {
```

---

## Execution Order

1. **Phase 1** - Schema fixes (uncomment threadMetadata, add indexes, export schema)
2. **Phase 2** - Add schema imports to all files using paginator/stream
3. **Phase 3** - Fix stream structure issues
4. **Phase 4** - Fix messages/threads queries
5. **Phase 5** - Fix agent function references
6. **Phase 6** - Fix chat.ts function references
7. **Phase 7** - Fix message body field
8. **Phase 8** - Add type annotations

---

## Testing After Each Phase

After each phase, run:
```bash
npx convex typecheck
```

Expected error count reduction:
- After Phase 1: -10 errors
- After Phase 2: -8 errors
- After Phase 3: -15 errors
- After Phase 4: -4 errors
- After Phase 5: -3 errors
- After Phase 6: -2 errors
- After Phase 7: -1 error
- After Phase 8: 0 errors

---

## Files Modified

1. `convex/schema.ts` - Uncomment threadMetadata, add indexes, export schema
2. `convex/agent/streams.ts` - Fix validators, imports, types
3. `convex/agent/files.ts` - Add schema import
4. `convex/agent/messages.ts` - Add schema import, fix queries
5. `convex/agent/threads.ts` - Add schema import
6. `convex/agents.ts` - Fix function references
7. `convex/chat.ts` - Fix function references
8. `convex/messages.ts` - Fix body field

---

## Estimated Time
- Phases 1-2: 15 minutes
- Phases 3-4: 20 minutes
- Phases 5-6: 15 minutes
- Phases 7-8: 10 minutes

**Total: ~60 minutes**
