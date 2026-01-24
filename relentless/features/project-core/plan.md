# Implementation Plan: Project Core Foundation

**Version:** 1.0
**Status:** Draft
**Date:** 2026-01-23

---

## 1. Executive Summary

This plan outlines the implementation of the Project Core Foundation, providing essential data structures and CRUD operations for a hierarchical context management system.

**Technical Stack:**

- Convex for ACID-compliant data layer
- TypeScript for type safety
- Vitest + convex-test for testing

---

## 2. Convex Schema Design

### 2.1 Core Tables

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Projects table
  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    archivedAt: v.optional(v.number()),
    metadata: v.object({
      description: v.optional(v.string()),
      icon: v.optional(v.string()),
      color: v.optional(v.string()),
    }),
  })
    .index('by_user', ['userId'])
    .index('by_user_archived', ['userId', 'archivedAt'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['userId', 'archivedAt'],
    }),

  // Threads table
  threads: defineTable({
    userId: v.string(),
    projectId: v.optional(v.id('projects')),
    title: v.string(),
    mode: v.union(
      v.literal('code'),
      v.literal('learn'),
      v.literal('think'),
      v.literal('create'),
    ),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    metadata: v.object({
      messageCount: v.number(),
      lastModel: v.optional(v.string()),
      isPinned: v.boolean(),
    }),
  })
    .index('by_user', ['userId'])
    .index('by_user_project', ['userId', 'projectId'])
    .index('by_user_last_active', ['userId', 'lastActiveAt'])
    .index('by_project', ['projectId']),

  // Project mentions
  projectMentions: defineTable({
    userId: v.string(),
    threadId: v.id('threads'),
    projectId: v.id('projects'),
    messageId: v.id('messages'),
    mentionedAt: v.number(),
    attachmentOffered: v.boolean(),
    attachmentAccepted: v.optional(v.boolean()),
  })
    .index('by_thread', ['threadId'])
    .index('by_thread_project', ['threadId', 'projectId']),
})
```

---

## 3. Implementation Phases

### Phase 1: Schema & Migration (Week 1)

**Tasks:**

1. Implement schema in `convex/schema.ts`
2. Write schema validation tests
3. Deploy to staging environment
4. Write migration script
5. Test migration on staging data
6. Write and test rollback script

**Deliverables:**

- Schema deployed to production
- Migration script ready
- Rollback script tested

---

### Phase 2: Project CRUD (Week 1-2)

**Tasks:**

1. Implement `createProject` mutation
2. Implement `renameProject` mutation
3. Implement `archiveProject` mutation
4. Implement `listProjects` query
5. Implement `searchProjects` query
6. Write unit tests
7. Verify performance (<200ms)

**Deliverables:**

- All CRUD operations working
- Unit tests passing
- Performance benchmarks met

---

### Phase 3: Thread Operations (Week 2)

**Tasks:**

1. Implement `attachThreadToProject` mutation
2. Implement `detachThreadFromProject` mutation
3. Implement `moveThreadToProject` mutation
4. Implement `createThreadInProject` mutation
5. Implement project mention tracking
6. Write unit tests
7. Test transaction atomicity

**Deliverables:**

- Thread operations working
- Atomic updates verified
- Unit tests passing

---

## 4. Testing Strategy

### 4.1 Unit Tests

```typescript
// Example test structure
import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

test('create project', async () => {
  const t = convexTest(schema)
  const projectId = await t.mutation(api.projects.create, {
    userId: 'user1',
    name: 'Test Project',
  })
  expect(projectId).toBeDefined()
})
```

### 4.2 Migration Tests

- Test with 1000+ chats
- Verify no data loss
- Measure migration time (<10 min for 10k chats)
- Test rollback script

---

## 5. Rollout Plan

1. Deploy schema to staging
2. Run migration on staging data
3. Verify migration results
4. Deploy to production with feature flag
5. Monitor for 24 hours
6. Enable for 100% of users

---

## 6. Risk Mitigation

| Risk                    | Mitigation                          |
| ----------------------- | ----------------------------------- |
| Migration failure       | Test rollback script thoroughly     |
| Performance degradation | Add indexes, benchmark early        |
| Data corruption         | ACID transactions, validation tests |

---

**End of Plan**
