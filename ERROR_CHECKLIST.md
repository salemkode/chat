# Convex TypeScript Errors - Complete Fix Checklist

**Total Errors: 38 errors across 6 files**

Last Updated: 2026-01-26

---

## Summary by File

| File | Error Count | Priority |
|------|-------------|----------|
| convex/schema.ts | 10 | 🔴 CRITICAL - Blocks everything |
| convex/agent/streams.ts | 18 | 🔴 HIGH |
| convex/agent/messages.ts | 3 | 🟡 MEDIUM |
| convex/agent/threads.ts | 1 | 🟡 MEDIUM |
| convex/agents.ts | 2 | 🟡 MEDIUM |
| convex/chat.ts | 4 | 🟡 MEDIUM |

---

## 🔴 CRITICAL: convex/schema.ts (10 errors)

### Error 1: Models table outside defineSchema
**Line:** 199
**Error:** `TS2769: No overload matches this call... 'models' does not exist in type...`
**Cause:** The `models` table definition is placed AFTER the closing of `defineSchema()` but BEFORE properly closing with `})`

**Fix:**
```typescript
// WRONG (current structure around line 195-199)
  ...vectorTables,

  // Admin-managed AI models
  models: defineTable({  // <-- This is OUTSIDE defineSchema!

// CORRECT - Move models table definition BEFORE line 195
// Insert models table right before "EXISITING TABLES - Keep as-is" section

// Add around line 188 (before ...vectorTables):
  // Admin-managed AI models
  models: defineTable({
    modelId: v.string(),
    displayName: v.string(),
    isEnabled: v.boolean(),
    isFree: v.boolean(),
    sortOrder: v.number(),
  }).index('by_enabled', ['isEnabled']),

  // Admin users
  admins: defineTable({
    userId: v.id('users'),
  }).index('by_userId', ['userId']),

  // Chat sections
  sections: defineTable({
    name: v.string(),
    emoji: v.string(),
    sortOrder: v.number(),
    userId: v.id('users'),
    isExpanded: v.boolean(),
  }).index('by_userId', ['userId']),

  // Vector tables
  ...vectorTables,
})
```

### Errors 2-10: schemaDefinition export failures
**Lines:** 250-258
**Errors:**
- Line 250: `TS2552: Cannot find name 'messages'`
- Line 251: `TS18004: No value exists for 'streamingMessages'`
- Line 252: `TS18004: No value exists for 'streamDeltas'`
- Line 253: `TS18004: No value exists for 'memories'`
- Line 254: `TS2552: Cannot find name 'files'`
- Line 255: `TS18004: No value exists for 'models'`
- Line 256: `TS18004: No value exists for 'admins'`
- Line 257: `TS2552: Cannot find name 'sections'`
- Line 258: `TS18004: No value exists for 'threadMetadata'`

**Cause:** The variables `threads`, `messages`, etc. don't exist as separate variables. They're defined inline inside `defineSchema()`.

**Fix Options:**

**Option A: Don't export schemaDefinition (RECOMMENDED)**
Remove the export entirely and handle imports differently in other files.

```typescript
// DELETE lines 246-258 completely
// Export for use with convex-helpers utilities
export const schemaDefinition = { ... } // <-- DELETE THIS

// Instead, just export the schema:
export default defineSchema({
  // ... all your tables
})
```

**Option B: Create proper schema definition export**
Only needed if you're using convex-helpers paginator/stream with schema parameter:

```typescript
// Import at top of file
import { SchemaDefinition } from 'convex/server'

// Create a schema definition object that can be reused
const schemaDefinition: SchemaDefinition = {
  // Copy all table definitions here
  // This requires restructuring the file significantly
}

// Then use it in both places:
const threads = defineTable(schemaDefinition.threads)
// ...
export default defineSchema(schemaDefinition)
export { schemaDefinition }
```

**RECOMMENDATION:** Use Option A - Remove the export. Instead, pass the schema directly to functions that need it:

```typescript
// In files using paginator/stream:
import schema from '../schema.js' // Import the default export
await paginator(ctx.db, schema)
```

---

## 🔴 HIGH: convex/agent/streams.ts (18 errors)

### Error 1: Table name mismatch
**Line:** 48
**Error:** `TS2345: Argument of type 'Id<"streams">' is not assignable to parameter of type 'Id<"streamingMessages">'`
**Cause:** The validator says `Id<"streams">` but schema defines `streamingMessages` table

**Fix:**
```typescript
// Line 42-47, change the validator:
const deltaValidator = v.object({
  streamId: v.id("streamingMessages"), // Changed from "streams"
  start: v.number(),
  end: v.number(),
  parts: v.array(v.any()),
});
```

### Errors 2-3: Scheduler function references
**Lines:** 118, 279
**Error:** `TS2345: Argument of type 'RegisteredMutation<...>' is not assignable to parameter of type 'SchedulableFunctionReference'`
**Cause:** Passing registered mutations directly to scheduler

**Fix:**
```typescript
// WRONG (line 121-124):
await ctx.scheduler.runAfter(
  TIMEOUT_INTERVAL,
  timeoutStream,  // <-- Direct function reference
  { streamId },
);

// CORRECT - The function reference should be a string path
await ctx.scheduler.runAfter(
  TIMEOUT_INTERVAL,
  "convex/agent/streams:timeoutStream", // Use string path
  { streamId: args.streamId },
);
```

**Do the same for line 279-282:**
```typescript
await ctx.scheduler.runAfter(
  DELETE_STREAM_DELAY,
  "convex/agent/streams:deleteStreamsPageForThreadIdMutation",
  { streamId: args.streamId },
);
```

**And line 324:**
```typescript
"convex/agent/streams:timeoutStream"
```

**And line 444:**
```typescript
"convex/agent/streams:deleteAllStreamsForThreadIdAsync"
```

**And line 478-480:**
```typescript
await ctx.scheduler.runAfter(
  0,
  "convex/agent/streams:deleteStreamsPageForThreadIdMutation",
  { streamId: args.streamId },
);
```

### Error 4: Missing 'schema' variable
**Line:** 145
**Error:** `TS2304: Cannot find name 'schema'`
**Cause:** `stream()` function requires schema parameter but `schema` is not defined

**Fix:**
```typescript
// Option 1: Import and use the schema definition
import schemaDefinition from "../schema.js";
// Then at line 145:
stream(ctx.db, schemaDefinition)

// Option 2 (simpler): Don't use stream() helper, use regular query
// Replace the entire stream usage with direct query:
const allStreamMessages = stateKinds.map((stateKind) =>
  ctx.db
    .query("streamingMessages")
    .withIndex("threadId_state_order_stepOrder", (q) =>
      q
        .eq("threadId", args.threadId)
        .eq("state.kind", stateKind)
        .gte("order", args.streamOrder ?? 0),
    )
    .collect()
);
```

### Error 5: timeoutFn state check
**Line:** 240
**Error:** `TS2339: Property 'state' does not exist on type...`
**Cause:** Union type from `ctx.db.get()` includes multiple tables, need to narrow the type

**Fix:**
```typescript
// Line 237-242, change:
const timeoutFn = args.streamId
  ? await ctx.db.get(args.streamId)
  : undefined;

// To:
const timeoutFn = args.streamId
  ? await ctx.db.get("_scheduled_functions", args.streamId)
  : undefined;
```

**And at line 240-241:**
```typescript
// Add type guard:
if (timeoutFn && "state" in timeoutFn && timeoutFn.state.kind === "pending") {
  await ctx.scheduler.cancel(timeoutFn._id);
}
```

### Error 6-9: Missing schema for paginator/stream
**Lines:** 351, 378, 515
**Error:** Various "Cannot find name 'schema'" or "Expected 2 arguments, but got 1"
**Cause:** `paginator()` and `stream()` require schema as second argument

**Fix:**
```typescript
// Import at top of file:
import schemaDefinition from "../schema.js";

// Line 351:
const deltas = await paginator(ctx.db, schemaDefinition)

// Line 378:
stream(ctx.db, schemaDefinition)

// Line 515:
stream(ctx.db, schemaDefinition)
```

### Error 10: IndexRange .eq() not available
**Line:** 383
**Error:** `TS2339: Property 'eq' does not exist on type 'IndexRange'`
**Cause:** After using `stream()`, the result doesn't have filtering methods

**Fix:**
```typescript
// Lines 381-390, change from:
const allStreamMessages = stateKinds.map((stateKind) =>
  stream(ctx.db)
    .query("streamingMessages")
    .withIndex("threadId_state_order_stepOrder", (q) =>
      q
        .eq("threadId", args.threadId)
        .eq("state.kind", stateKind)
        .gte("order", args.streamOrder ?? 0),
    ),
);

// To - filter after fetching:
const allStreamMessages = await Promise.all(
  stateKinds.map(async (stateKind) => {
    const messages = await ctx.db
      .query("streamingMessages")
      .withIndex("threadId_state_order_stepOrder")
      .collect();
    return messages.filter(
      m =>
        m.threadId === args.threadId &&
        m.state.kind === stateKind &&
        m.order >= (args.streamOrder ?? 0)
    );
  })
);
```

### Error 11-12: Implicit any types
**Lines:** 565-566
**Error:** `TS7006: Parameter implicitly has an 'any' type`
**Cause:** Filter/map callbacks need type annotations

**Fix:**
```typescript
// Lines 563-567, add type annotations:
.filter((m: Doc<"streamDeltas">) => m.message !== undefined)
.map(async (msg: Doc<"streamDeltas">) => {
```

---

## 🟡 MEDIUM: convex/agent/messages.ts (3 errors)

### Error 1: Missing schema for paginator
**Line:** 118
**Error:** `TS2554: Expected 2 arguments, but got 1`
**Cause:** `paginator()` requires schema parameter

**Fix:**
```typescript
// Import at top:
import schemaDefinition from "../schema.js";

// Line 118:
const messages = await paginator(ctx.db, schemaDefinition)
```

### Error 2: IndexRange filter issue
**Line:** 123
**Error:** `TS2339: Property 'eq' does not exist on type 'IndexRange'`
**Cause:** Can't filter after pagination

**Fix:**
```typescript
// Lines 117-124, change from:
const messages = await paginator(ctx.db)
  .query("messages")
  .withIndex("by_userId", (q) => q.eq("userId", userId))
  .filter((q) => q.eq("status", "success"))
  .order("desc")
  .paginate(args.paginationOpts)

// To:
const messages = await paginator(ctx.db, schemaDefinition)
  .query("messages")
  .withIndex("threadId_status_tool_order_stepOrder", (q) =>
    q
      .eq("threadId", args.threadId) // Add threadId to args if needed
      .eq("status", "success")
  )
  .order("desc")
  .paginate(args.paginationOpts)
```

**OR filter in JavaScript after pagination:**
```typescript
const result = await paginator(ctx.db, schemaDefinition)
  .query("messages")
  .withIndex("by_userId")
  .order("desc")
  .paginate(args.paginationOpts);

const messages = {
  ...result,
  page: result.page.filter(m => m.status === "success"),
};
```

### Error 3: Role type mismatch
**Line:** 275
**Error:** `TS2367: This comparison appears to be unintentional... types '"system" | "user" | "assistant"' and '"tool"' have no overlap`
**Cause:** `role` field doesn't include "tool", "tool" is a separate boolean field

**Fix:**
```typescript
// Line 275, change from:
tool: message.role === "tool",

// To:
tool: message.tool, // This is already a boolean in the schema
```

---

## 🟡 MEDIUM: convex/agent/threads.ts (1 error)

### Error 1: Missing schema for paginator
**Line:** 68
**Error:** `TS2554: Expected 2 arguments, but got 1`
**Cause:** `paginator()` requires schema parameter

**Fix:**
```typescript
// Import at top:
import schemaDefinition from "../schema.js";

// Line 68:
const threads = await paginator(ctx.db, schemaDefinition)
```

---

## 🟡 MEDIUM: convex/agents.ts (2 errors)

### Error 1-2: Function reference type issues
**Lines:** 66, 91
**Error:** `TS2345: Argument of type 'RegisteredMutation<...>' is not assignable to parameter...`
**Cause:** Can't pass registered mutations to `ctx.runMutation`/`ctx.runQuery`

**Fix:**
```typescript
// Line 66, change from:
await ctx.runMutation(saveMessage, {
  threadId: args.threadId,
  content: args.content,
  role: args.role,
})

// To - Call the function directly:
import { saveMessage } from "./agent/messages.js";
await saveMessage(ctx, {
  threadId: args.threadId,
  content: args.content,
  role: args.role,
});

// Line 91, change from:
const threadId = await localCreateThread(ctx, {
  title: args.title,
  sectionId: args.sectionId,
  emoji: args.emoji,
})

// To:
import { createThread } from "./agent/functions.js";
const threadId = await createThread(ctx, {
  title: args.title,
  sectionId: args.sectionId,
  emoji: args.emoji,
});
```

---

## 🟡 MEDIUM: convex/chat.ts (4 errors)

### Errors 1-4: Function reference type issues
**Lines:** 12, 43, 54, 56
**Error:** Same as above - can't pass registered functions to `ctx.runQuery/runMutation`

**Fix:**

**Line 12:**
```typescript
// Change from:
return await ctx.runQuery(listThreadsAgent, args)

// To:
import { listThreads } from "./agent/threads.js";
return await listThreads(ctx, args)
```

**Line 43:**
```typescript
// Change from:
await ctx.runMutation(deleteThreadFn, { threadId: args.threadId })

// To:
import { deleteThread } from "./agent/threads.js";
await deleteThread(ctx, { threadId: args.threadId })
```

**Line 54:**
```typescript
// Change from:
return await ctx.runQuery(listMessagesAgent, args)

// To:
import { listMessages } from "./agent/messages.js";
return await listMessages(ctx, args)
```

**Line 56:**
```typescript
// Change from:
return await ctx.runMutation(createThreadFn, args)

// To:
import { createThread } from "./agent/functions.js";
return await createThread(ctx, args)
```

### Error 5: Missing export
**Line:** 67
**Error:** `TS2339: Property 'createUserMessage' does not exist on type 'typeof import...'`
**Cause:** Function not exported from agent/index

**Fix:**

**Option A: Export the function from agent/index**
```typescript
// In convex/agent/index.ts (create if doesn't exist):
export { createUserMessage } from "./messages.js";
```

**Option B: Import directly from the file**
```typescript
// Line 67, change from:
const { createUserMessage: createUserMessageFn } = await import('./agent')

// To:
const { createUserMessage: createUserMessageFn } = await import('./agent/messages.js')
```

---

## Execution Order

### Phase 1: Fix schema.ts (BLOCKS EVERYTHING)
1. ✅ Move models, admins, sections tables inside defineSchema
2. ✅ Remove or fix schemaDefinition export
3. Run `npx convex typecheck` - should reduce from 38 to ~28 errors

### Phase 2: Fix imports across all files
4. Add `import schemaDefinition from "../schema.js"` to:
   - convex/agent/streams.ts
   - convex/agent/messages.ts
   - convex/agent/threads.ts
5. Update all `paginator(ctx.db)` to `paginator(ctx.db, schemaDefinition)`
6. Update all `stream(ctx.db)` to `stream(ctx.db, schemaDefinition)`
7. Run typecheck - should reduce to ~18 errors

### Phase 3: Fix streams.ts errors
8. Fix deltaValidator to use `Id<"streamingMessages">`
9. Change all scheduler calls to use string paths
10. Fix timeoutFn type check
11. Add type annotations to filter/map
12. Run typecheck - should reduce to ~8 errors

### Phase 4: Fix messages.ts errors
13. Fix filter after pagination
14. Fix role === "tool" comparison
15. Run typecheck - should reduce to ~5 errors

### Phase 5: Fix function reference errors
16. Fix all ctx.runQuery/runMutation calls to use direct imports
17. Fix missing exports
18. Run typecheck - should have 0 errors

---

## Quick Reference: Common Patterns

### Pattern 1: Adding schema import
```typescript
// Add to top of file:
import schemaDefinition from "../schema.js";
```

### Pattern 2: Fixing paginator
```typescript
// Before:
const results = await paginator(ctx.db)

// After:
const results = await paginator(ctx.db, schemaDefinition)
```

### Pattern 3: Fixing scheduler calls
```typescript
// Before:
await ctx.scheduler.runAfter(delay, someMutation, args)

// After:
await ctx.scheduler.runAfter(delay, "convex/path/to:function", args)
```

### Pattern 4: Fixing runMutation/runQuery
```typescript
// Before:
await ctx.runMutation(someMutation, args)

// After:
import { someMutation } from "./path/to/file.js"
await someMutation(ctx, args)
```

---

## Verification Commands

```bash
# After each phase, run:
npx convex typecheck

# Expected error counts:
# After Phase 1: ~28 errors (from 38)
# After Phase 2: ~18 errors
# After Phase 3: ~8 errors
# After Phase 4: ~5 errors
# After Phase 5: 0 errors
```

---

## Notes

- **Why so many schema-related errors?** The codebase was recently refactored to use convex-helpers which requires explicit schema passing
- **Why string paths for scheduler?** Convex scheduler needs the function path as a string to serialize it properly
- **Why direct imports instead of ctx.runMutation?** Direct function calls are more type-safe and allow better autocomplete

---

## Need Help?

If you're stuck on a specific error:
1. Check the error line number in this document
2. Look at the "Fix" section
3. Copy the code snippet
4. Run typecheck to verify
5. Move to next error
