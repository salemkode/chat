# Phase 2 - Step 3: Create Memory Search Functions

## Status: ⏳ Pending

## Objective

Create `convex/functions/memory.ts` with search functionality:

- `searchMemory` action - Search across all memory types
- Get query embedding from OpenAI
- Vector search with filtering by scope
- Result scoring and deduplication

## Functions to Implement

```typescript
export const searchMemory = action({...})
async function getQueryEmbedding(query: string): Promise<number[]>
```

## Features

- Search user/thread/project memories
- Filter by scope, category, threadId, projectId
- Configurable minScore and maxResults
- Hybrid results from all scopes when scope='all'

## Verification

- [ ] searchMemory action created
- [ ] getQueryEmbedding helper working
- [ ] Vector search functional
- [ ] Filtering working correctly
- [ ] Scoring and sorting correct
- [ ] Tested with sample data

## Dependencies

- Requires Step 1 (schema) to be deployed
- Requires OPENAI_API_KEY in environment
