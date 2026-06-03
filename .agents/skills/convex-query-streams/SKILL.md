---
name: convex-query-streams
description: Build or refactor paginated Convex queries using convex-helpers/server/stream. Use when working with stream, mergedStream, flatMap, map-null filtering, filterWith, asyncMap over paginated arrays, merging multiple Convex indexes into one feed, nested stream pagination, or avoiding collect-based pagination in Convex TypeScript.
---

# Convex Query Streams

Use `convex-helpers/server/stream` when a Convex query needs cursor pagination across one or more ordered index scans, especially when the result looks like SQL `UNION ALL`, nested joins, or post-index enrichment.

## Imports

```typescript
import { mergedStream, stream } from "convex-helpers/server/stream";
import schema from "./schema";
```

Adjust the schema import path to the local Convex layout.

## Decision Guide

- Multiple index branches for one sorted feed: use `mergedStream([...], sortFields).map(...).paginate(paginationOpts)`.
- Parent row expands to many child rows: use `.flatMap(parent => childStream, childIndexFields).paginate(paginationOpts)`.
- Each row only needs enrichment or one related lookup: use `.map(async row => enrichedOrNull).paginate(paginationOpts)`.
- Non-index filter after the scan: prefer `.filterWith(async row => predicate)` for clarity, or return `null` from `.map` when enrichment and filtering are naturally coupled.
- Already have `ctx.db.query(...).paginate(...)`: use `asyncMap(result.page, ...)` and manually filter nulls.

## Stream Rules

- Each stream passed to `mergedStream` must already be ordered consistently by its index and `.order(...)`.
- The second `mergedStream` argument is the ordered sort-field prefix used to compare rows across streams, such as `["_creationTime"]` or `["sort", "lastMessageAt"]`.
- Returning `null` from stream `.map(async ...)` drops that row from the emitted page and advances the cursor.
- Dropped rows are still read. Sparse filters may read many rows to fill a page; set `maximumRowsRead` when needed, accepting that capped reads can produce fewer than `numItems`.
- In reactive clients, pair stream `.paginate(...)` with `usePaginatedQuery` from `convex-helpers/react`, or pass `customPagination: true` when using cached query helpers, so `endCursor` is handled correctly.
- Do not treat stream filtering as an authorization boundary for secret data. Cursor state can reveal index-key progress; enforce sensitive authorization in index constraints or authoritative server validation.
- Avoid `.collect()` on large or merged streams when the user expects paginated behavior.

## `asyncMap` Is Different

`asyncMap` from `convex-helpers` works on materialized arrays, not lazy streams. Returning `null` from `asyncMap` leaves nulls in the array, so filter manually:

```typescript
const page = (
  await asyncMap(result.page, async (doc) => {
    if (!shouldKeep(doc)) return null;
    return enrich(doc);
  })
).filter(Boolean);
```

Use stream `.map` only before `.paginate(...)`; use `asyncMap` only after a page already exists.

## References

Read [examples.md](references/examples.md) when implementing a query or explaining the exact behavior of `mergedStream`, `.flatMap`, stream `.map`, `.filterWith`, and array `asyncMap`.
