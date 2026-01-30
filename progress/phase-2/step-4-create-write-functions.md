# Phase 2 - Step 4: Create Memory Write Functions

## Status: ⏳ Pending

## Objective

Implement memory creation functions in `convex/functions/memory.ts`:

- `createUserMemory` - Create user-scoped memory
- `createThreadMemory` - Create thread-scoped memory
- `createProjectMemory` - Create project-scoped memory
- `getEmbedding` - Helper for generating embeddings

## Functions to Implement

```typescript
export const createUserMemory = mutation({...})
export const createThreadMemory = mutation({...})
export const createProjectMemory = mutation({...})
async function getEmbedding(text: string): Promise<number[]>
```

## Features

- Automatic embedding generation
- User authorization checks
- Timestamp tracking
- Category and tag support
- Source tracking (manual, extracted, system)

## Verification

- [ ] All three create functions implemented
- [ ] getEmbedding helper working
- [ ] User authorization enforced
- [ ] Embeddings generated correctly
- [ ] Error handling in place
- [ ] Tested all three scopes

## Dependencies

- Requires Step 1 (schema) deployed
- Requires Step 3 (search functions) for embedding helper
