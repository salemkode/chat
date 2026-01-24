# Product Requirements Document: Project Core Foundation

**Version:** 1.0
**Status:** Draft
**Date:** 2026-01-23

---

## 1. Problem Statement

Users currently have a flat list of conversations with no way to organize them by context or project. This leads to:

- **Context Pollution:** Unrelated conversations compete for cognitive attention
- **Poor Discoverability:** Difficult to find past conversations on specific topics
- **No Semantic Grouping:** Cannot group related conversations together
- **Scalability Issues:** Chat list becomes unwieldy as conversation count grows

---

## 2. Goals

### Primary Goals

1. **Enable Project Creation:** Users can create projects to group related conversations
2. **Thread Organization:** Users can attach/detach/move threads between projects
3. **Data Foundation:** Provide robust data structures for higher-level features
4. **Backward Compatibility:** Existing users' data is preserved during migration

### Secondary Goals

1. **Search Capability:** Users can quickly find projects by name
2. **Archival:** Users can archive old projects without losing data
3. **Performance:** All operations complete within 200ms

---

## 3. User Personas

### Primary Persona: Knowledge Worker

- **Name:** Alex
- **Role:** Software Engineer / Researcher
- **Pain Points:**
  - Works on multiple projects simultaneously
  - Has hundreds of conversations across different topics
  - Struggles to find past conversations about specific projects
  - Wants to keep related conversations organized

### Secondary Persona: Student

- **Name:** Jordan
- **Role:** Graduate Student
- **Pain Points:**
  - Researching multiple thesis topics
  - Needs to reference past conversations about specific papers
  - Wants to organize conversations by research area

---

## 4. User Stories

### Epic 1: Data Layer Foundation

**US-001.1:** Convex Schema Design

> As a backend engineer, I need to design and deploy the Convex schema for projects, threads, memories, and project mentions so that the system has a solid data foundation.

**US-001.2:** Database Migration Script

> As a backend engineer, I need to migrate existing chats to the new threads table so that existing users don't lose data.

### Epic 2: Project Management

**US-002.1:** Project CRUD API

> As a user, I want to create, rename, and archive projects so that I can organize my conversations.

**US-002.2:** Project Search

> As a user, I want to search for projects by name so that I can quickly find projects in large lists.

### Epic 3: Thread Management

**US-003.1:** Thread Attachment API

> As a user, I want to attach a thread to a project so that the thread appears in the project's sidebar section.

**US-003.2:** Thread Creation in Project

> As a user, I want to create a new thread directly within a project so that it's automatically associated with that project.

### Epic 4: Project Mention Tracking

**US-008.2:** Project Mention Tracking

> As the system, I need to track @Project mentions to prevent duplicate banners.

---

## 5. Functional Requirements

### FR-1: Project Management

- Users can create projects with custom names
- Users can rename existing projects
- Users can archive projects (soft delete)
- Archived projects retain all thread associations
- Users can search for projects by name with fuzzy matching

### FR-2: Thread Management

- Users can create threads within projects
- Users can create threads outside of projects (free chats)
- Users can manually assign threads to projects
- Users can remove threads from projects
- Users can move threads between projects
- Threads belong to at most one project at any time

### FR-3: Data Integrity

- All operations maintain referential integrity
- Thread attachment operations are atomic
- Project lastActiveAt updates on thread operations
- Project mentions are tracked for UX state

---

## 6. Non-Functional Requirements

### NFR-1: Performance

- CRUD operations: <200ms
- Search queries: <50ms
- Vector index: <100ms baseline

### NFR-2: Scalability

- Support 1000+ projects per user
- Support 10,000+ threads per user

### NFR-3: Data Integrity

- Migration preserves all existing data
- Rollback script tested and validated
- Migration completes in <10 minutes for 10k chats

---

## 7. Success Metrics

### Usage Metrics

- Number of projects created per user (target: 5+ projects for active users)
- Percentage of threads attached to projects (target: 60%+)
- Project creation rate (target: 2+ projects per week per active user)

### Performance Metrics

- CRUD operation latency (p50, p99)
- Search query latency (p50, p99)
- Migration success rate (target: 100%)

### Quality Metrics

- Zero data loss during migration
- All unit tests passing
- Code coverage >80%

---

## 8. Open Questions

1. **Project Naming Constraints:** Should we enforce any naming rules beyond max length? (e.g., no special characters, no profanity)
2. **Project Limits:** Should there be a maximum number of projects per user?
3. **Archived Project Behavior:** Should archived projects appear in search results?
4. **Migration Strategy:** Should migration be opt-in or forced for all users?

---

## 9. Dependencies

### Required

- Convex backend deployed
- Existing chats/conversations table
- TypeScript environment configured

### Blocking

- `context-injection` feature (requires project/thread data structures)
- `memory-system` feature (requires project/thread data structures)
- `project-ui` feature (requires CRUD APIs)

---

## 10. Timeline

**Estimated Duration:** 2 weeks

**Sprint Breakdown:**

- Week 1: Schema design + migration script
- Week 2: Project CRUD + thread operations

---

## 11. Risks

| Risk                      | Impact | Probability | Mitigation                             |
| ------------------------- | ------ | ----------- | -------------------------------------- |
| Migration failure         | High   | Low         | Thorough testing, rollback script      |
| Performance issues        | Medium | Medium      | Early benchmarking, index optimization |
| Data corruption           | High   | Low         | ACID transactions, validation tests    |
| User resistance to change | Low    | High        | Gradual rollout, clear documentation   |

---

## 12. Future Enhancements

Out of scope for this feature but planned for future releases:

- Project templates
- Project collaboration/sharing
- Automatic project suggestions
- Cross-project thread referencing
- Project-level permissions

---

**End of PRD**
