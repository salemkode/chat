# Phase 1 - Step 1: Update Convex Schema with New Memory Tables

## Status: ✅ Completed (On dev deployment)

## Objective

Update `convex/schema.ts` to include new memory tables:

- `userMemories` - General user-level knowledge
- `threadMemories` - Thread-specific memories
- `projectMemories` - Project/group memories
- `projects` - For grouping threads
- `memorySyncState` - Sync state tracking

## Changes Required

1. ✅ Add `userMemories` table with vector index
2. ✅ Add `threadMemories` table with vector index
3. ✅ Add `projectMemories` table with vector index
4. ✅ Add `projects` table for thread grouping
5. ✅ Add `memorySyncState` table for sync tracking
6. ✅ Remove/deprecate old tables (memoryFiles, memoryChunks)

## Notes

- All tables will have `userId` for scoping
- Vector indexes with 1536 dimensions (OpenAI)
- Filter fields for multi-tenant queries

## Verification

- [x] Schema updated successfully
- [x] All vector indexes defined
- [x] All indexes properly configured
- [x] Schema synced to dev deployment

## Issues Found

- Initial attempt had syntax errors with vector search API
- Simplified schema first, will add advanced features in Step 3
