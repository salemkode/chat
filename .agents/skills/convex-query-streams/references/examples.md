# Convex QueryStreams Examples

## Mental Model

| SQL idea | Stream API |
| --- | --- |
| `UNION ALL` plus `ORDER BY` | `mergedStream([s1, s2], sortFields)` |
| `JOIN` where one parent yields many children | `.flatMap(doc => stream(...), indexFields)` |
| `SELECT` plus row enrichment | `.map(async doc => ({ ...doc, related }))` |
| Post-index `WHERE` | `.filterWith(async doc => ...)` or `.map` returning `null` |
| Cursor `LIMIT` pagination | `.paginate(paginationOpts)` |

## `mergedStream`: Combine Ordered Index Branches

Use one stream per equality branch, then merge by the shared ordering prefix.

```typescript
const userOwned = stream(ctx.db, schema)
  .query("chats")
  .withIndex("by_user_sort_lastMessageAt", (q) => q.eq("userId", userId))
  .order("desc");

const assigned = stream(ctx.db, schema)
  .query("chats")
  .withIndex("by_assignee_sort_lastMessageAt", (q) =>
    q.eq("assigneeId", userId),
  )
  .order("desc");

return await mergedStream([userOwned, assigned], ["sort", "lastMessageAt"])
  .map(async (chat) => {
    if (chat.archivedByUsers?.includes(userId)) return null;

    const lastMessage = chat.lastMessageId
      ? await ctx.db.get(chat.lastMessageId)
      : null;

    return { ...chat, lastMessage };
  })
  .paginate(paginationOpts);
```

Use this for "my feed from several roles" queries, such as challenger/defender/brehon cases or user-owned/assigned chats.

## `.map`: Enrich One Row, Optionally Drop It

Stream `.map` is a one-to-one transform, except `null` means "do not emit this row".

```typescript
return await baseStream
  .map(async (thread) => {
    const user = await ctx.db.get(thread.userId);
    if (!user) return null;

    return {
      ...thread,
      user,
    };
  })
  .paginate(paginationOpts);
```

Use this when each input row yields at most one output row.

## `.filterWith`: Explicit Post-Index Filter

Use `.filterWith` when the query is easier to read as a predicate.

```typescript
return await stream(ctx.db, schema)
  .query("cases")
  .withIndex("by_status_sort", (q) => q.eq("status", status))
  .order("desc")
  .filterWith(async (caseDoc) => {
    const attempt = await ctx.db.get(caseDoc.attemptId);
    return attempt?.ownerId === userId;
  })
  .paginate({
    ...paginationOpts,
    maximumRowsRead: 200,
  });
```

Filtering this way still reads rows before dropping them. Add `maximumRowsRead` if the predicate may be sparse, and expect capped reads to return smaller pages when too many rows are skipped.

## `.flatMap`: Parent To Many Ordered Children

Use `.flatMap` when pagination needs to walk many child rows per parent.

```typescript
return await stream(ctx.db, schema)
  .query("friends")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .flatMap(
    (friend) =>
      stream(ctx.db, schema)
        .query("messages")
        .withIndex("from_to_created", (q) =>
          q.eq("from", friend.friendId).eq("to", userId),
        )
        .order("desc"),
    ["from", "to", "_creationTime"],
  )
  .paginate(paginationOpts);
```

The second argument is the inner stream's index fields. Use `.map` instead if the parent only needs one related lookup.

## `asyncMap`: Arrays Only

Use `asyncMap` after `ctx.db.query(...).paginate(...)` has returned a materialized page.

```typescript
const result = await ctx.db
  .query("attempts")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .paginate(paginationOpts);

const page = (
  await asyncMap(result.page, async (attempt) => {
    const thread = await ctx.db.get(attempt.threadId);
    if (!thread) return null;

    return {
      ...attempt,
      thread,
    };
  })
).filter(Boolean);

return {
  ...result,
  page,
};
```

Unlike stream `.map`, `asyncMap` does not auto-filter nulls.

## Anti-Patterns

- Calling `.collect()` and paginating the array yourself for large feeds.
- Building a merged feed by querying each branch into arrays, concatenating, sorting, then slicing.
- Using regular Convex `usePaginatedQuery` with stream pagination in reactive clients; import `usePaginatedQuery` from `convex-helpers/react` instead, unless cached query helpers are configured with `customPagination: true`.
- Using post-index filtering for secrets or auth-sensitive data where cursor key leakage matters.
- Expecting `asyncMap` to behave like stream `.map`.
- Scattering ad hoc `Id<"table">` branding casts when normalizing request IDs; use the repository's Convex ID helpers or server validators.
