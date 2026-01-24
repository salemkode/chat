# Feature Specification: Project Core Foundation

**Feature Branch**: `003-project-core`
**Created**: 2026-01-23
**Status**: Design Phase
**Input**: Provide essential data structures and CRUD operations for hierarchical context management with projects and threads
**Routing Preference**: auto: good | allow free: yes

---

## 1. Abstract

This specification defines the **Project Core Foundation**, providing the essential data structures and CRUD operations for a hierarchical context management system. This feature establishes the projects and threads as first-class entities with bidirectional relationships, enabling users to organize conversations into semantic workspaces.

---

## 2. User Scenarios & Testing _(mandatory)_

### User Story 1 - Create and Manage Projects (Priority: P1)

As a user, I want to create projects to organize related conversations so that my conversations have semantic context and are easier to find later.

**Why this priority**: Projects are the foundational entity. Without projects, the entire hierarchical organization system cannot function.

**Independent Test**: Can be tested by creating a project via UI/API, verifying it appears in the project list, and confirming all required fields are correctly stored.

**Acceptance Scenarios**:

1. **Given** a user provides a valid project name, **When** they create a project, **Then** the project MUST be stored with name, userId, createdAt, lastActiveAt, and metadata fields
2. **Given** a project exists, **When** a user renames it, **Then** the name MUST update and lastActiveAt MUST timestamp to now
3. **Given** a project exists, **When** a user archives it, **Then** archivedAt MUST be set to current timestamp and project MUST be excluded from default queries
4. **Given** an archived project, **When** a user searches for projects, **Then** the archived project MUST only appear in "archived" filter view
5. **Given** a user provides an empty project name, **When** they attempt to create, **Then** the system MUST reject with validation error

---

### User Story 2 - Create and Organize Threads (Priority: P1)

As a user, I want to create threads within projects so that my conversations are organized by context and purpose.

**Why this priority**: Threads are the primary conversation entity. They must support project association from day one for the system to deliver value.

**Independent Test**: Can be tested by creating a thread within a project, verifying thread.projectId matches the project, and confirming the thread appears in the project's thread list.

**Acceptance Scenarios**:

1. **Given** a user is in a project context, **When** they create a new thread, **Then** the thread MUST have projectId set to the current project
2. **Given** a user is on the home screen, **When** they create a thread, **Then** the thread MUST have projectId=null (free chat)
3. **Given** a thread exists in project A, **When** a user moves it to project B, **Then** thread.projectId MUST update to project B and both projects' lastActiveAt MUST update
4. **Given** a thread in a project, **When** a user removes it from the project, **Then** thread.projectId MUST become null
5. **Given** a thread is created, **When** stored, **Then** mode MUST default to "code" and lastActiveAt MUST equal createdAt

---

### User Story 3 - Search Projects and Threads (Priority: P2)

As a user, I want to search for projects by name so that I can quickly find specific projects when I have many of them.

**Why this priority**: Search becomes important as the number of projects grows. Not critical for MVP but essential for usability at scale.

**Independent Test**: Can be tested by creating 100 projects with various names, then searching with partial/fuzzy queries and verifying correct results are returned.

**Acceptance Scenarios**:

1. **Given** 100 projects exist, **When** a user searches for "thesis", **Then** results MUST include projects with names containing "thesis" (case-insensitive)
2. **Given** a search query has typos, **When** search executes, **Then** results MUST include phonetically similar or fuzzy-matched project names
3. **Given** search results, **When** returned, **Then** results MUST be ordered by lastActiveAt descending (most recent first)
4. **Given** an empty search query, **When** search executes, **Then** all non-archived projects MUST be returned
5. **Given** search takes >50ms, **When** measured, **Then** the search MUST be optimized to complete within 50ms per NFR

---

### User Story 4 - View Project Thread Hierarchy (Priority: P2)

As a user, I want to see threads nested under their projects in the sidebar so that I can understand the conversation organization at a glance.

**Why this priority**: Visual hierarchy is important for UX but secondary to core CRUD operations. The system works without it, but it's less usable.

**Independent Test**: Can be tested by creating multiple projects with threads, then querying the sidebar data structure and verifying threads are correctly nested under their parent projects.

**Acceptance Scenarios**:

1. **Given** a project with 5 threads exists, **When** sidebar data is queried, **Then** the project MUST have a threads array containing exactly those 5 threads
2. **Given** a free chat thread exists (projectId=null), **When** sidebar data is queried, **Then** the thread MUST appear in a separate "Free Chats" section
3. **Given** a project has no threads, **When** sidebar renders, **Then** the project MUST still be visible (empty workspace)
4. **Given** a thread is moved from project A to B, **When** sidebar refreshes, **Then** the thread MUST appear under project B and NOT under project A

---

### Edge Cases

- What happens when a project is deleted? (System uses archive, not delete)
- What happens when a user tries to move a thread to a non-existent project?
- What happens when a project with 1000+ threads is queried? (Performance)
- What happens when two projects are merged?
- What happens when thread mode is invalid (not code/learn/think/create)?
- What happens during concurrent thread moves (race conditions)?

---

## 3. Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to create projects with a user-specified name (1-100 chars)
- **FR-002**: Users MUST be able to rename existing projects
- **FR-003**: Users MUST be able to archive projects (soft delete via archivedAt timestamp)
- **FR-004**: Archived projects MUST retain all thread associations
- **FR-005**: Projects MUST persist independently of thread lifecycle
- **FR-006**: Users MUST be able to search for projects by name with fuzzy matching
- **FR-007**: Users MUST be able to create threads within a project (projectId set)
- **FR-008**: Users MUST be able to create threads outside of any project (free chat, projectId=null)
- **FR-009**: Users MUST be able to manually assign a thread to a project
- **FR-010**: Users MUST be able to remove a thread from a project (convert to free chat)
- **FR-011**: Users MUST be able to move a thread from one project to another
- **FR-012**: Threads MUST belong to at most one project at any time
- **FR-013**: All operations MUST maintain referential integrity between projects and threads
- **FR-014**: Thread attachment operations MUST be atomic (all-or-nothing)
- **FR-015**: Project lastActiveAt MUST update on thread attachment/detachment/creation
- **FR-016**: Project mentions MUST be tracked for UX state management

### Key Entities

- **Project**: Bounded context container with id, userId, name, createdAt, lastActiveAt, archivedAt, metadata
- **Thread**: Sequential conversation with id, userId, projectId (optional), title, mode, createdAt, lastActiveAt, metadata
- **ProjectMetadata**: Additional project data including description, color, icon
- **ThreadMetadata**: Additional thread data including messageCount, agentIds used

---

## 4. Test Strategy (MANDATORY)

### Unit Test Approach

- Project CRUD operations (create, rename, archive)
- Thread CRUD operations (create, update mode, move)
- Referential integrity validation (projectId references)
- Timestamp updates (lastActiveAt logic)
- Project name validation (length, characters)
- Thread mode validation (enum values)

### Integration Test Scenarios

- Create project → create thread in project → verify linkage
- Move thread from project A to B → verify both projects' lastActiveAt update
- Archive project with threads → verify threads retain association
- Search projects with fuzzy matching → verify results
- Concurrent thread modifications → verify atomicity

### Edge Case Tests

- Move thread to non-existent project (error handling)
- Create project with empty/invalid name (validation)
- Archive/un-archive project flow (state transitions)
- Very long project names (100+ chars)
- Special characters in project names (unicode, emojis)
- Maximum limits (1000+ projects, 10000+ threads)

### Test Data Requirements

- Sample projects with various names and states (active, archived)
- Sample threads across different projects and modes
- Edge case strings (empty, very long, special chars)
- Large datasets for performance testing (1000+ projects)
- Concurrent operation test scenarios

---

## 5. Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can create a project and create a thread within it in under 10 seconds
- **SC-002**: Project and thread CRUD operations complete within 200ms (per NFR)
- **SC-003**: Search queries return results within 50ms for databases with 1000+ projects
- **SC-004**: 100% of referential integrity is maintained (no orphaned thread.projectId values)
- **SC-005**: Migration script completes in under 10 minutes for databases with 10k existing chats
- **SC-006**: Zero data loss during migration and rollback (verified by checksums)

---

## 6. Core Entities (Detailed)

### 2.1 Project

A bounded context container encapsulating:

- Semantic domain (e.g., "Graduation Thesis", "Product Feature X")
- Associated threads
- Project-level metadata (creation date, importance score, archived state)

**Formal Definition:**

```
Project = {
  id: UUID,
  userId: String,
  name: String,
  createdAt: Timestamp,
  lastActiveAt: Timestamp,
  archivedAt: Optional<Timestamp>,
  metadata: ProjectMetadata
}
```

**Properties:**

- Projects are user-created and user-managed
- Projects persist independently of threads
- Projects can exist without threads (empty workspace)
- Projects can be archived but not deleted (memory preservation)

### 2.2 Thread

A sequential conversation history between user and AI agent(s).

**Formal Definition:**

```
Thread = {
  id: UUID,
  userId: String,
  projectId: Optional<UUID>,
  title: String,
  mode: "code" | "learn" | "think" | "create",
  createdAt: Timestamp,
  lastActiveAt: Timestamp,
  metadata: ThreadMetadata
}
```

**Properties:**

- Threads may belong to zero or one Project
- Threads without `projectId` are "free chats"
- Thread metadata tracks message count and activity

---

## 3. Functional Requirements

### FR-1: Project Management

**FR-1.1** Users MUST be able to create new projects with a user-specified name.

**FR-1.2** Users MUST be able to rename existing projects.

**FR-1.3** Users MUST be able to archive projects (soft delete).

**FR-1.4** Archived projects MUST retain all thread associations.

**FR-1.5** Projects MUST persist independently of thread lifecycle.

**FR-1.6** Users MUST be able to search for projects by name with fuzzy matching.

### FR-2: Thread Management

**FR-2.1** Users MUST be able to create threads within a project.

**FR-2.2** Users MUST be able to create threads outside of any project (free chats).

**FR-2.3** Users MUST be able to manually assign a thread to a project.

**FR-2.4** Users MUST be able to remove a thread from a project (convert to free chat).

**FR-2.5** Users MUST be able to move a thread from one project to another.

**FR-2.6** Threads MUST belong to at most one project at any time.

### FR-3: Data Integrity

**FR-3.1** All operations MUST maintain referential integrity between projects and threads.

**FR-3.2** Thread attachment operations MUST be atomic.

**FR-3.3** Project `lastActiveAt` MUST update on thread attachment/detachment/creation.

**FR-3.4** Project mentions MUST be tracked for UX state management.

---

## 4. Non-Functional Requirements

### NFR-1: Performance

**NFR-1.1** All CRUD operations MUST complete within 200ms.

**NFR-1.2** Search queries MUST return results within 50ms.

**NFR-1.3** Vector index MUST support <100ms queries on 10k+ memories.

### NFR-2: Scalability

**NFR-2.1** System MUST support 1000+ projects per user.

**NFR-2.2** System MUST support 10,000+ threads per user.

### NFR-3: Data Integrity

**NFR-3.1** Migration scripts MUST preserve all existing data.

**NFR-3.2** Rollback scripts MUST be tested and validated.

---

## 5. System Constraints

**TC-1** System MUST run on Convex backend infrastructure.

**TC-2** System MUST use TypeScript for type safety.

**TC-3** Migration MUST complete in <10 minutes for 10k chats.

---

## 6. Acceptance Criteria

The system is considered specification-compliant when:

1. All functional requirements (FR-1 through FR-3) are implemented and tested.
2. All non-functional requirements (NFR-1 through NFR-3) are measured and verified.
3. All system constraints (TC) are satisfied.
4. Migration script runs successfully without data loss.
5. Rollback script is tested and documented.

---

**End of Specification**
