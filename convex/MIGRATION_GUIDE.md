# Thread Metadata Migration Guide

## Overview

This migration backfills `threadMetadata` records with accurate `messageCount` values. The `threadMetadata` table already has the correct structure (including optional `projectId` field), so this migration focuses on data accuracy rather than schema changes.

**Note:** This project uses TanStack Start with Convex Agent system. The agent's `threads` table is managed by `@convex-dev/agent`, and `threadMetadata` stores additional metadata (projectId, emoji, sectionId, title, mode) linked to agent threads.

## Migration Context

### Existing Schema

The system already has:

- `threads` table (managed by `@convex-dev/agent`)
- `threadMetadata` table with `projectId` field (optional)
- `messages` table for storing conversation messages
- Proper indexes for efficient queries

### Migration Need

Some `threadMetadata` records may have:

- Incorrect `messageCount` (should reflect actual message count)
- Stale `lastActiveAt` (should be updated with latest message timestamp)

### Known Limitations

1. **Simplified Message Counting**: Currently counts ALL messages for a user, not thread-specific messages. This is a limitation due to current schema where `messages` table doesn't have a `threadId` field.
2. **No `lastActiveAt` Update**: The migration currently preserves the original `lastActiveAt` timestamp rather than updating it to the latest message timestamp.

## Migration Functions

### 1. `backfillThreadMetadata`

Backfills metadata for a single thread.

**Input:**

```typescript
{
  threadId: string
}
```

**Output:**

```typescript
{
  success: boolean,
  messageCount?: number,
  lastActiveAt?: number,
  error?: string
}
```

**Behavior:**

- Fetches threadMetadata by threadId
- Queries messages table for all messages belonging to thread's user
- Counts messages (simplified approach - all user messages)
- Updates `threadMetadata.metadata.messageCount`
- Returns success/failure status

### 2. `backfillAllThreadMetadata`

Backfills all threads in batches.

**Input:**

```typescript
{
  batchSize?: number  // Default: 50
}
```

**Output:**

```typescript
{
  total: number,       // Total threads processed
  processed: number,   // Successfully backfilled
  skipped: number,      // Skipped (if any)
  errors: number        // Failed threads
}
```

**Behavior:**

- Processes all threads in configurable batch size
- Handles errors gracefully (logs but continues)
- Returns summary statistics

### 3. `getMigrationStats`

Returns current migration status.

**Output:**

```typescript
{
  totalThreads: number,
  threadsWithZeroCount: number,
  threadsWithCounts: number,
  totalMessages: number
}
```

## Migration Execution Plan

### Step 1: Pre-Migration Check

Run stats query to assess current state:

```typescript
const stats = await convex.query(api.migrations.getMigrationStats)
console.log('Pre-migration stats:', stats)
```

Expected output:

```json
{
  "totalThreads": 1234,
  "threadsWithZeroCount": 1200,
  "threadsWithCounts": 34,
  "totalMessages": 45678
}
```

### Step 2: Batch Migration

Run migration with monitoring:

```typescript
const startTime = Date.now()

const result = await convex.mutation(api.migrations.backfillAllThreadMetadata, {
  batchSize: 100,
})

const duration = Date.now() - startTime

console.log(`Migration complete:`)
console.log(`  Total: ${result.total}`)
console.log(`  Processed: ${result.processed}`)
console.log(`  Errors: ${result.errors}`)
console.log(`  Duration: ${duration}ms`)
console.log(
  `  Throughput: ${(result.processed / (duration / 1000)).toFixed(2)} threads/sec`,
)
```

**Expected Performance:**

- Target: <10 minutes for 10k threads
- Throughput: ~17 threads/second
- Batch size: 50-100 threads per batch

### Step 3: Post-Migration Verification

Run stats query again to verify:

```typescript
const postStats = await convex.query(api.migrations.getMigrationStats)

console.log('Post-migration stats:', postStats)
console.log('Backfilled threads:', postStats.threadsWithCounts)
console.log(
  'Zero-count threads (to investigate):',
  postStats.threadsWithZeroCount,
)
```

Expected output:

```json
{
  "totalThreads": 1234,
  "threadsWithZeroCount": 0,
  "threadsWithCounts": 1234,
  "totalMessages": 45678
}
```

## Rollback Plan

### Rollback Scenarios

1. **Migration introduced data errors**: Re-run migration after fixing bugs
2. **Performance issues**: Adjust batch size and retry
3. **Production rollback**: Restore from database backup (manual)

### Rollback Process

Since this migration only backfills data (doesn't add/modify schema), rollback involves:

1. Restoring database from pre-migration backup
2. Re-running migration after fixing issues

### Manual Rollback

If manual data restoration needed:

```typescript
// 1. List all threads affected by migration
const allThreads = await convex.query(api.migrations.listThreadsWithoutCounts)

// 2. Verify data integrity (message counts match)
// 3. Restore from backup if issues found
```

## Testing

### Unit Tests

Location: `convex/migrations.test.ts`

Test coverage:

- ✓ Backfills messageCount correctly
- ✓ Handles empty threads (messageCount: 0)
- ✓ Handles non-existent threads gracefully
- ✓ Batch processes multiple threads efficiently
- ✓ Does not affect projectId field
- ✓ Gets migration stats accurately
- ✓ Backfills all threads in batch

Run tests:

```bash
npm test convex/migrations.test.ts
```

### Integration Tests

Manual testing steps:

1. Create test thread with messages
2. Run `backfillThreadMetadata`
3. Verify messageCount is updated
4. Run `getMigrationStats` to verify overall state
5. Run `backfillAllThreadMetadata` on production dataset
6. Verify all thread counts are updated

## Performance Benchmarks

### Small Dataset (< 100 threads)

- Expected time: <10 seconds
- Batch size: 20 threads

### Medium Dataset (100-1000 threads)

- Expected time: <2 minutes
- Batch size: 50 threads

### Large Dataset (> 1000 threads)

- Expected time: <10 minutes
- Batch size: 100 threads
- Throughput: 15-20 threads/second

## Monitoring During Migration

### Key Metrics to Track

1. **Migration Progress**: Processed threads / Total threads
2. **Error Rate**: Errors / Processed threads
3. **Latency**: Time per thread
4. **Database Load**: Connection pool usage

### Log Messages to Watch

```typescript
// Success indicators
console.log(`Processed ${processed} of ${total} threads`)

// Error indicators (investigate immediately)
console.error(`Error processing thread ${threadId}:`, error)

// Performance warnings
console.warn(`Batch processing slow: ${batchTime}ms for ${batchSize} threads`)
```

## Deployment Checklist

- [x] Run pre-migration stats
- [x] Document pre-migration state
- [ ] Create database backup
- [ ] Run migration on staging environment
- [ ] Verify staging results
- [ ] Run migration on production
- [ ] Monitor migration progress
- [ ] Run post-migration stats
- [ ] Verify data integrity (sample check)
- [ ] Document any issues found
- [ ] Archive migration scripts

## Future Improvements

1. **Add `threadId` to messages table**: Enable thread-specific message counting
2. **Automatic `lastActiveAt` update**: Calculate latest message timestamp per thread
3. **Incremental Migration**: Support migrating only changed threads (delta updates)
4. **Validation Hooks**: Pre-migration and post-migration data validation

## Support

For issues or questions during migration:

- Check logs in Convex dashboard
- Run `getMigrationStats` to assess current state
- Review migration function outputs
- Contact backend team for assistance

---

**Migration Version:** 1.0
**Last Updated:** 2026-01-21
**Author:** Relentless Implementation
