# Phase 2 - Step 5: Create Memory List and Management Functions

## Status: ⏳ Pending

## Objective

Implement list, update, and delete functions:

- `listUserMemories` - List user memories
- `listThreadMemories` - List thread memories
- `updateMemory` - Update any memory type
- `deleteMemory` - Delete any memory type

## Functions to Implement

```typescript
export const listUserMemories = query({...})
export const listThreadMemories = query({...})
export const updateMemory = mutation({...})
export const deleteMemory = mutation({...})
```

## Features

- Filter by category
- Pagination support (limit)
- User ownership verification
- Update with embedding regeneration
- Soft delete (mark as deleted) or hard delete

## Verification

- [ ] List functions working for both scopes
- [ ] Category filtering functional
- [ ] Update works for all scopes
- [ ] Update regenerates embeddings
- [ ] Delete works for all scopes
- [ ] Authorization checks working
- [ ] Tested CRUD operations

## Dependencies

- Requires Step 1 (schema) deployed
- Requires Step 4 (write functions)
