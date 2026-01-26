# Convex Coding Rules & Standards

## Core Principles

1. **Keep it Simple** - Avoid complex utilities and abstractions
2. **Use Native Convex APIs** - Don't rely on external helper libraries
3. **Static Imports Only** - No dynamic imports for better type safety
4. **Auth Everywhere** - All agent functions must include authentication

---

## Rule 1: NO `paginator(ctx.db, schema)` ❌

### Why It's Wrong
- Convex doesn't natively support this syntax
- Requires convex-helpers library which adds complexity
- Creates schema parameter passing issues

### What To Use Instead ✅

**Simple Pagination:**
```typescript
// ✅ CORRECT - Use native Convex cursor-based pagination
export const listMessages = query({
  args: {
    threadId: v.id("threads"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("messages")
      .withIndex("threadId_status_tool_order_stepOrder", (q) =>
        q.eq("threadId", args.threadId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return results;
  },
});
```

**With Filtering:**
```typescript
// ✅ CORRECT - Filter in memory after fetching
export const listSuccessfulMessages = query({
  args: {
    threadId: v.id("threads"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("messages")
      .withIndex("threadId_status_tool_order_stepOrder", (q) =>
        q.eq("threadId", args.threadId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Filter in memory
    return {
      ...results,
      page: results.page.filter(m => m.status === "success"),
    };
  },
});
```

**Collect All (for small datasets):**
```typescript
// ✅ CORRECT - For small result sets
export const getAllUserThreads = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return threads;
  },
});
```

---

## Rule 2: NO Dynamic Imports ❌

### Why It's Wrong
```typescript
// ❌ WRONG - No type safety, hard to debug
const { createUserMessage: createUserMessageFn } = await import('./agent')
const { someFunc } = await import('./some/where')
```

### What To Use Instead ✅

**Static Imports at Top:**
```typescript
// ✅ CORRECT - Clear, type-safe, easy to find
import { createUserMessage } from "./agent/messages.js";
import { createThread } from "./agent/functions.js";
import { listThreads } from "./agent/threads.js";

export const generateMessage = action({
  args: {
    threadId: v.id("threads"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Use the imported functions directly
    const messageId = await createUserMessage(ctx, {
      threadId: args.threadId,
      content: args.content,
    });

    return messageId;
  },
});
```

---

## Rule 3: NO `ctx.runMutation()` / `ctx.runQuery()` with Registered Functions ❌

### Why It's Wrong
```typescript
// ❌ WRONG - Type errors, can't pass registered functions
await ctx.runMutation(someRegisteredFunction, args)
```

### What To Use Instead ✅

**Direct Function Calls:**
```typescript
// ✅ CORRECT - Import and call directly
import { saveMessage } from "./agent/messages.js";

export const sendMessage = mutation({
  args: { content: v.string() },
  handler: async (ctx, args) => {
    // Call the imported function directly
    const messageId = await saveMessage(ctx, {
      threadId: args.threadId,
      content: args.content,
      role: "user",
    });

    return messageId;
  },
});
```

**For Scheduling:**
```typescript
// ✅ CORRECT - Use string path for scheduler
await ctx.scheduler.runAfter(
  1000,
  "convex/agent/messages:processMessage",
  { messageId }
);
```

---

## Rule 4: Modify Agent Functions to Include Auth ✅

### Pattern: Add Auth Parameter

**Before (from @convex/agent):**
```typescript
// ❌ WRONG - No authentication
export const createThread = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const threadId = await ctx.db.insert("threads", {
      title: args.title,
      // Missing userId!
    });
    return threadId;
  },
});
```

**After (with our auth):**
```typescript
// ✅ CORRECT - Includes authentication
import { getAuthUserId } from "@convex-dev/auth/server";

export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
    sectionId: v.optional(v.id("sections")),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Create thread with user ownership
    const threadId = await ctx.db.insert("threads", {
      userId,
      title: args.title,
      sectionId: args.sectionId,
      emoji: args.emoji,
      status: "active",
    });

    return threadId;
  },
});
```

### Pattern: Wrap Agent Functions

**Create wrapper in main files:**
```typescript
// ✅ CORRECT - Wrap agent functions with auth checks
import { getAuthUserId } from "@convex-dev/auth/server";
import { createThread as baseCreateThread } from "./agent/functions.js";

export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
    sectionId: v.optional(v.id("sections")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Call base function with userId
    return await baseCreateThread(ctx, {
      ...args,
      userId,
    });
  },
});
```

---

## Rule 5: NO `stream(ctx.db, schema)` ❌

### Why It's Wrong
- Not a native Convex API
- Requires external helpers
- Creates schema parameter issues

### What To Use Instead ✅

**Direct Query with Index:**
```typescript
// ✅ CORRECT - Use native Convex query API
export const getStreamMessages = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("streamingMessages")
      .withIndex("threadId_state_order_stepOrder", (q) =>
        q.eq("threadId", args.threadId)
      )
      .collect();

    return messages;
  },
});
```

---

## Rule 6: Use Explicit Table Names for `db.get()` and `db.patch()` ✅

### Required Format
```typescript
// ✅ CORRECT
await ctx.db.get("threads", threadId)
await ctx.db.patch("threads", threadId, { title: "New Title" })

// ❌ WRONG - Missing table name
await ctx.db.get(threadId)
await ctx.db.patch(threadId, { title: "New Title" })
```

---

## Rule 7: Scheduler Uses String Paths ✅

### Correct Pattern
```typescript
// ✅ CORRECT - Use string path
await ctx.scheduler.runAfter(
  5000,
  "convex/agent/streams:timeoutStream",
  { streamId }
)

// ❌ WRONG - Direct function reference
await ctx.scheduler.runAfter(5000, timeoutStream, { streamId })
```

---

## Rule 8: All Public Functions Must Have Auth Checks ✅

### Template
```typescript
import { getAuthUserId } from "@convex-dev/auth/server";

export const myFunction = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // ALWAYS include auth check
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Rest of your logic
    // ...
  },
});
```

---

## Migration Checklist

For each file in `convex/agent/`:

1. [ ] Remove `paginator(ctx.db)` calls
2. [ ] Remove `stream(ctx.db)` calls
3. [ ] Add `getAuthUserId()` checks
4. [ ] Add `userId` to all database inserts
5. [ ] Update validators to require `userId` where needed
6. [ ] Replace scheduler function references with string paths
7. [ ] Test each function manually

---

## Examples: Before & After

### Example 1: List Messages

**Before:**
```typescript
import { paginator } from "convex-helpers/server/pagination";

export const listMessages = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const messages = await paginator(ctx.db)
      .query("messages")
      .withIndex("threadId_status_tool_order_stepOrder")
      .collect();
    return messages;
  },
});
```

**After:**
```typescript
export const listMessages = query({
  args: {
    threadId: v.id("threads"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const results = await ctx.db
      .query("messages")
      .withIndex("threadId_status_tool_order_stepOrder", (q) =>
        q.eq("threadId", args.threadId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return results;
  },
});
```

### Example 2: Create Thread

**Before:**
```typescript
export const createThread = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const threadId = await ctx.db.insert("threads", {
      title: args.title,
    });
    return threadId;
  },
});
```

**After:**
```typescript
export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
    sectionId: v.optional(v.id("sections")),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const threadId = await ctx.db.insert("threads", {
      userId,
      title: args.title,
      sectionId: args.sectionId,
      emoji: args.emoji,
      status: "active",
    });

    return threadId;
  },
});
```

---

## Quick Reference: Common Tasks

### Get user's threads
```typescript
const threads = await ctx.db
  .query("threads")
  .withIndex("by_userId", (q) => q.eq("userId", userId))
  .collect();
```

### Get paginated messages
```typescript
const results = await ctx.db
  .query("messages")
  .withIndex("threadId_status_tool_order_stepOrder", (q) =>
    q.eq("threadId", threadId)
  )
  .order("desc")
  .paginate(paginationOpts);
```

### Update with explicit table name
```typescript
await ctx.db.patch("threads", threadId, {
  title: "New Title"
});
```

### Schedule a function
```typescript
await ctx.scheduler.runAfter(
  delay,
  "convex/path/to:function",
  args
);
```

---

## Summary

| ❌ DON'T | ✅ DO |
|---------|-------|
| `paginator(ctx.db, schema)` | Use native `.paginate()` |
| `stream(ctx.db, schema)` | Use native `.query().collect()` |
| `await import('./agent')` | Static imports at top |
| `ctx.runMutation(fn, args)` | Direct function calls |
| Functions without auth | Always add `getAuthUserId()` |
| Scheduler with function refs | Use string paths |
| `db.get(id)` | `db.get("table", id)` |
| `db.patch(id, data)` | `db.patch("table", id, data)` |
