# Agent Base Integration Rules

## Core Principles

1. **User Ownership**: All threads and messages MUST have a `userId` that references our `users` table
2. **Backward Compatibility**: Minimize breaking changes to existing UI
3. **Data Integrity**: Never lose existing user data
4. **Type Safety**: Maintain full TypeScript type safety throughout
5. **Performance**: Don't degrade performance with the migration

## Schema Rules

### Thread Ownership
```typescript
// ✅ CORRECT - Thread has explicit user owner
threads: defineTable({
  userId: v.id('users'), // REQUIRED - always references users table
  // ... other fields
})

// ❌ WRONG - Optional or string userId
threads: defineTable({
  userId: v.optional(v.string()), // WRONG
  // ...
})
```

### Message Structure
```typescript
// ✅ CORRECT - Full message structure from agent_base
messages: defineTable({
  userId: v.optional(v.id('users')), // Optional for anonymous threads
  threadId: v.id('threads'), // REQUIRED
  order: v.number(), // REQUIRED - message order in thread
  stepOrder: v.number(), // REQUIRED - step order within a message
  // ... all other fields from agent_base
})

// ❌ WRONG - Simplified message structure loses functionality
messages: defineTable({
  body: v.string(),
  userId: v.id('users'),
  role: v.union(v.literal('user'), v.literal('assistant')),
  // Missing: order, stepOrder, embeddings, streaming support, etc.
})
```

### Section Integration
```typescript
// ✅ CORRECT - Threads reference sections directly
threads: defineTable({
  sectionId: v.optional(v.id('sections')), // Link to folder
  emoji: v.optional(v.string()), // Thread icon
  // ...
})

sections: defineTable({
  name: v.string(),
  emoji: v.string(),
  sortOrder: v.number(),
  userId: v.id('users'), // Owner of the section
  isExpanded: v.boolean(),
})
  .index('by_userId', ['userId'])

// ❌ WRONG - Separate threadMetadata table
threadMetadata: defineTable({
  threadId: v.string(), // Don't use string reference
  emoji: v.string(),
  sectionId: v.optional(v.id('sections')),
  userId: v.id('users'),
})
```

## Function Rules

### Authentication Required
```typescript
// ✅ CORRECT - Always check authentication
export const createThread = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    // Create thread with userId
    const threadId = await ctx.db.insert('threads', {
      userId, // Always include
      // ...
    })
    return threadId
  },
})

// ❌ WRONG - No authentication check
export const createThread = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // No auth check - allows anonymous creation
    const threadId = await ctx.db.insert('threads', {
      userId: args.userId, // Don't trust client input
      // ...
    })
    return threadId
  },
})
```

### Authorization Checks
```typescript
// ✅ CORRECT - Verify user owns the resource
export const updateThread = mutation({
  args: {
    threadId: v.id('threads'),
    patch: v.object({ /* ... */ }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error('Thread not found')
    }

    await ctx.db.patch(args.threadId, args.patch)
    return await ctx.db.get(args.threadId)
  },
})

// ❌ WRONG - No ownership check
export const updateThread = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Anyone can update any thread!
    await ctx.db.patch(args.threadId, args.patch)
    return await ctx.db.get(args.threadId)
  },
})
```

### User Filtering
```typescript
// ✅ CORRECT - Always filter by userId
export const listThreads = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { page: [], isDone: true, continueCursor: '' }

    return await ctx.db
      .query('threads')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .paginate(args.paginationOpts)
  },
})

// ❌ WRONG - No user filtering
export const listThreads = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    // Returns all threads for all users!
    return await ctx.db
      .query('threads')
      .paginate(args.paginationOpts)
  },
})
```

## Frontend Rules

### Hook Usage
```typescript
// ✅ CORRECT - Use new agent hooks
import { useThreadMessages } from '@/hooks/agent/useThreadMessages'

function ChatThread({ threadId }: { threadId: string }) {
  const { messages, loading, error } = useThreadMessages({
    threadId,
    paginationOpts: { numItems: 50, cursor: null },
  })
  // ...
}

// ❌ WRONG - Use old hooks after migration
import { useMessages } from '@/hooks/useMessages' // Old hook
```

### Component Updates
```typescript
// ✅ CORRECT - Update to use new message structure
interface Message {
  _id: Id<'messages'>
  threadId: Id<'threads'>
  userId?: Id<'users'>
  order: number
  stepOrder: number
  status: 'pending' | 'success' | 'failed'
  message?: {
    role: 'user' | 'assistant' | 'system'
    content: any[]
  }
  text?: string
  tool: boolean
  // ... other fields
}

// ❌ WRONG - Keep using old message structure
interface Message {
  body: string
  userId: Id<'users'>
  role: 'user' | 'assistant'
}
```

## Migration Rules

### File Structure
```
convex/
├── agent/                    # NEW - All agent functionality
│   ├── threads.ts           # From agent_base/src/component/threads.ts
│   ├── messages.ts          # From agent_base/src/component/messages.ts
│   ├── streams.ts           # From agent_base/src/component/streams.ts
│   ├── files.ts             # From agent_base/src/component/files.ts
│   ├── users.ts             # From agent_base/src/component/users.ts
│   ├── vector/              # From agent_base/src/component/vector/
│   │   ├── tables.ts
│   │   └── index.ts
│   └── index.ts             # NEW - Main agent exports
├── schema.ts                 # UPDATE - Merge agent_base schema
├── chat.ts                   # UPDATE - Use local agent functions
├── messages.ts               # DELETE or UPDATE - Functionality moved
├── users.ts                  # KEEP - Simple user viewer
├── sections.ts               # UPDATE - Work with new threads
├── admin.ts                  # KEEP - Model management
└── auth.ts                   # KEEP - Authentication

src/
├── hooks/
│   └── agent/                # NEW - React hooks from agent_base
│       ├── useThreadMessages.ts
│       ├── useStreamingThreadMessages.ts
│       ├── useUIMessages.ts
│       ├── useStreamingUIMessages.ts
│       ├── useSmoothText.ts
│       └── optimisticallySendMessage.ts
├── lib/
│   └── agent/                # NEW - Client utilities from agent_base
│       ├── index.ts          # Adapted Agent class
│       ├── messages.ts
│       ├── threads.ts
│       ├── search.ts
│       ├── files.ts
│       └── streaming.ts
└── routes/
    ├── chat.$chatId.tsx      # UPDATE - Use new hooks
    └── chat.index.tsx        # UPDATE - Use new structure
```

### Copying Rules

1. **Always adapt** copied code to use `id('users')` instead of `string` for userId
2. **Always add** authentication checks to public functions
3. **Always add** authorization checks (user owns resource)
4. **Never copy** deprecated fields or functions
5. **Always update** imports to use local paths
6. **Always test** after copying

### Code Adaptation Pattern

When copying from agent_base, follow this pattern:

```typescript
// BEFORE (from agent_base)
export const listThreadsByUserId = query({
  args: {
    userId: v.optional(v.string()), // ❌ String userId
    // ...
  },
  handler: async (ctx, args) => {
    const threads = await paginator(ctx.db, schema)
      .query("threads")
      .withIndex("userId", (q) => q.eq("userId", args.userId)) // ❌ Uses args.userId
      // ...
  },
})

// AFTER (adapted for our backend)
export const listThreads = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx) // ✅ Get from auth
    if (!userId) return { page: [], isDone: true, continueCursor: '' }

    const threads = await paginator(ctx.db, schema)
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", userId)) // ✅ Use auth userId
      // ...
  },
})
```

## Testing Rules

### Must Test
1. ✅ Thread creation with authenticated user
2. ✅ Thread listing returns only user's threads
3. ✅ Thread update fails for non-owner
4. ✅ Thread deletion fails for non-owner
5. ✅ Message creation in thread
6. ✅ Message listing returns only thread's messages
7. ✅ Section creation and linking
8. ✅ Moving threads between sections
9. ✅ Streaming messages work
10. ✅ Vector search works (if implemented)
11. ✅ File uploads work
12. ✅ All React hooks work correctly

### Test Data
```typescript
// Test user ownership
const user1 = await createUser('user1')
const user2 = await createUser('user2')

const thread1 = await createThread({ userId: user1 })
const thread2 = await createThread({ userId: user2 })

// User1 should only see thread1
const user1Threads = await listThreads({ userId: user1 })
assert(user1Threads.length === 1)
assert(user1Threads[0]._id === thread1)

// User1 should NOT be able to update thread2
await assertThrows(
  updateThread({ userId: user1, threadId: thread2, patch: { title: 'hacked' } })
)
```

## Deployment Rules

1. **Test in dev first**: Never deploy to production without testing
2. **Backup before migration**: Export all data before schema changes
3. **Gradual rollout**: Use feature flags if possible
4. **Monitor errors**: Watch for errors after deployment
5. **Rollback ready**: Keep old code commented out for quick rollback

## Code Review Checklist

- [ ] All userId fields use `v.id('users')` not `v.string()`
- [ ] All public functions check authentication
- [ ] All mutation functions check authorization
- [ ] All queries filter by userId where appropriate
- [ ] No deprecated fields or functions
- [ ] All imports updated to local paths
- [ ] TypeScript types are correct
- [ ] Tests written and passing
- [ ] Documentation updated

## Performance Rules

1. **Indexes**: Ensure all indexes exist before deploying
2. **Pagination**: Always use pagination for list functions
3. **Search indexes**: Set up search indexes for text/vector search
4. **N+1 queries**: Avoid N+1 query patterns
5. **File size**: Monitor file storage usage
6. **Vector search**: Only enable if needed (adds cost)

## Security Rules

1. **Never trust client input**: Always get userId from auth
2. **Sanitize all inputs**: Use validators
3. **Rate limiting**: Implement rate limits on expensive operations
4. **File validation**: Validate file types and sizes
5. **API key protection**: Never expose API keys in client code
6. **Admin functions**: Always verify admin status

## Common Mistakes to Avoid

### Mistake 1: Forgetting auth check
```typescript
// ❌ WRONG
export const createThread = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert('threads', args) // No userId!
  },
})

// ✅ CORRECT
export const createThread = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')
    return await ctx.db.insert('threads', { ...args, userId })
  },
})
```

### Mistake 2: String userId instead of Id
```typescript
// ❌ WRONG
threads: defineTable({
  userId: v.string(), // Should be v.id('users')
})

// ✅ CORRECT
threads: defineTable({
  userId: v.id('users'),
})
```

### Mistake 3: Not checking ownership
```typescript
// ❌ WRONG
export const deleteThread = mutation({
  args: { threadId: v.id('threads') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.threadId) // Anyone can delete!
  },
})

// ✅ CORRECT
export const deleteThread = mutation({
  args: { threadId: v.id('threads') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error('Thread not found')
    }

    await ctx.db.delete(args.threadId)
  },
})
```

### Mistake 4: Forgetting to update imports
```typescript
// ❌ WRONG - Still using agent_base imports
import { components } from '../_generated/api'
import { listUIMessages } from '@convex-dev/agent'

// ✅ CORRECT - Use local imports
import { listUIMessages } from '../agent/messages'
```

### Mistake 5: Keeping old simple message structure
```typescript
// ❌ WRONG - Lost all the agent functionality
messages: defineTable({
  body: v.string(),
  userId: v.id('users'),
  role: v.union(v.literal('user'), v.literal('assistant')),
})

// ✅ CORRECT - Full message structure
messages: defineTable({
  userId: v.optional(v.id('users')),
  threadId: v.id('threads'),
  order: v.number(),
  stepOrder: v.number(),
  status: v.union(v.literal('pending'), v.literal('success'), v.literal('failed')),
  message: v.optional(v.any()), // Complex message structure
  text: v.optional(v.string()),
  tool: v.boolean(),
  // ... all other fields from agent_base
})
```

## Next Steps After Reading These Rules

1. Read and understand `plan.md` completely
2. Set up the development environment
3. Start with Phase 1 (Schema Migration)
4. Follow the rules strictly
5. Test thoroughly at each phase
6. Get code reviews before merging
7. Deploy to dev environment first
8. Monitor for issues
9. Gradually roll out to production
