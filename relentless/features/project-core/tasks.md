# Implementation Tasks: Project Core Foundation

**Version:** 1.0
**Status:** Task Breakdown
**Date:** 2026-01-23

---

## Epic 1: Data Layer Foundation

### Story 1.1: Convex Schema Design

**Priority:** P0 (Blocker)
**Estimate:** 3 days

**Description:**
As a backend engineer, I need to design and deploy the Convex schema for projects, threads, memories, and project mentions so that the system has a solid data foundation.

**Tasks:**

- [ ] Design `projects` table schema with indexes
- [ ] Design `threads` table schema (extend existing chats)
- [ ] Design `memories` table schema with vector index
- [ ] Design `projectMentions` table schema
- [ ] Write schema validation tests
- [ ] Deploy schema to staging environment
- [ ] Verify index performance with synthetic data (10k+ records)

**Acceptance Criteria:**

- Schema deployed without errors
- All indexes created successfully
- Vector index supports <100ms queries on 10k memories
- Schema passes type checking in TypeScript

**Dependencies:** None

---

### Story 1.2: Database Migration Script

**Priority:** P0 (Blocker)
**Estimate:** 2 days

**Description:**
As a backend engineer, I need to migrate existing chats to the new threads table so that existing users don't lose data.

**Tasks:**

- [ ] Write migration script `migrateChatsToThreads`
- [ ] Add `projectId` field to threads (default `null`)
- [ ] Backfill thread metadata (messageCount, lastActiveAt)
- [ ] Test migration on staging data (1000+ chats)
- [ ] Write rollback script
- [ ] Document migration process
- [ ] Run migration on production with monitoring

**Acceptance Criteria:**

- All existing chats migrated to threads
- No data loss (verify message counts match)
- Migration completes in <10 minutes for 10k chats
- Rollback script tested and validated

**Dependencies:** Story 1.1

---

## Epic 2: Project Management

### Story 2.1: Project CRUD API

**Priority:** P0 (Blocker)
**Estimate:** 2 days

**Description:**
As a user, I want to create, rename, and archive projects so that I can organize my conversations.

**Tasks:**

- [ ] Implement `createProject` mutation
  - [ ] Validate project name (max 50 chars, no special chars)
  - [ ] Check for duplicate names per user
  - [ ] Return project ID
- [ ] Implement `renameProject` mutation
  - [ ] Validate new name
  - [ ] Update `lastActiveAt`
- [ ] Implement `archiveProject` mutation
  - [ ] Set `archivedAt` timestamp
  - [ ] Do NOT delete memories or threads
- [ ] Implement `listProjects` query
  - [ ] Filter by user ID
  - [ ] Exclude archived projects by default
  - [ ] Sort by `lastActiveAt` (descending)
- [ ] Write unit tests for all mutations/queries
- [ ] Add error handling (e.g., project not found)

**Acceptance Criteria:**

- Users can create projects with valid names
- Users cannot create duplicate project names
- Archived projects do not appear in default list
- All CRUD operations complete in <200ms

**Dependencies:** Story 1.1

---

### Story 2.2: Project Search

**Priority:** P1 (High)
**Estimate:** 1 day

**Description:**
As a user, I want to search for projects by name so that I can quickly find projects in large lists.

**Tasks:**

- [ ] Implement `searchProjects` query using Convex search index
- [ ] Support fuzzy matching (e.g., "Grad" matches "Graduation Thesis")
- [ ] Limit results to 10 items
- [ ] Highlight matching text in UI (frontend task)
- [ ] Test with 100+ projects

**Acceptance Criteria:**

- Search returns results in <50ms
- Fuzzy matching works for partial names
- Archived projects excluded from search

**Dependencies:** Story 2.1

---

## Epic 3: Thread Management

### Story 3.1: Thread Attachment API

**Priority:** P0 (Blocker)
**Estimate:** 2 days

**Description:**
As a user, I want to attach a thread to a project so that the thread appears in the project's sidebar section.

**Tasks:**

- [ ] Implement `attachThreadToProject` mutation
  - [ ] Validate thread and project exist
  - [ ] Validate user owns both
  - [ ] Update `thread.projectId`
  - [ ] Update `project.lastActiveAt`
  - [ ] Create audit log entry
- [ ] Implement `detachThreadFromProject` mutation
  - [ ] Set `thread.projectId = null`
  - [ ] Update `project.lastActiveAt`
- [ ] Implement `moveThreadToProject` mutation
  - [ ] Detach from old project
  - [ ] Attach to new project
  - [ ] Handle edge cases (already attached, same project)
- [ ] Write unit tests
- [ ] Add transaction support (ensure atomicity)

**Acceptance Criteria:**

- Thread attachment is atomic (no partial updates)
- User can attach/detach threads successfully
- Moving thread between projects updates both projects' `lastActiveAt`
- Operations complete in <100ms

**Dependencies:** Story 2.1

---

### Story 3.2: Thread Creation in Project

**Priority:** P0 (Blocker)
**Estimate:** 1 day

**Description:**
As a user, I want to create a new thread directly within a project so that it's automatically associated with that project.

**Tasks:**

- [ ] Implement `createThreadInProject` mutation
  - [ ] Accept `projectId` parameter
  - [ ] Set `thread.projectId` on creation
  - [ ] Update `project.lastActiveAt`
  - [ ] Generate default thread title
- [ ] Add validation (project exists, user owns project)
- [ ] Write unit tests

**Acceptance Criteria:**

- New threads created in project are automatically attached
- Project's `lastActiveAt` updates on thread creation
- Thread title is human-readable (e.g., "New conversation")

**Dependencies:** Story 2.1, Story 3.1

---

## Epic 4: Project Mention Tracking

### Story 4.1: Project Mention Tracking

**Priority:** P0 (Blocker)
**Estimate:** 1 day

**Description:**
As the system, I need to track @Project mentions to prevent duplicate banners.

**Tasks:**

- [ ] Create `projectMention` record on each @mention
- [ ] Store `threadId`, `projectId`, `messageId`, `mentionedAt`
- [ ] Set `attachmentOffered = true` when banner shown
- [ ] Update `attachmentAccepted` based on user action
- [ ] Write unit tests

**Acceptance Criteria:**

- Each @mention creates a `projectMention` record
- Dismissed banners do not reappear

**Dependencies:** Story 1.1

---

## Summary

**Total Epics:** 4
**Total Stories:** 7
**Estimated Duration:** 2 weeks

**Critical Path:**

1. Epic 1: Data Layer Foundation (Week 1)
2. Epic 2: Project Management (Week 1-2)
3. Epic 3: Thread Management (Week 2)
4. Epic 4: Project Mention Tracking (Week 2)

---

**End of Tasks Document**
