# Project Core Foundation

**Status:** 🚧 In Progress
**Priority:** P0 (Blocker)
**Estimated Duration:** 2 weeks

---

## Overview

Project Core Foundation provides the essential data structures and CRUD operations for a hierarchical context management system. This feature establishes projects and threads as first-class entities, enabling users to organize conversations into semantic workspaces.

---

## Key Features

- **Project Management:** Create, rename, archive, and search projects
- **Thread Operations:** Attach, detach, and move threads between projects
- **Data Migration:** Seamless migration from existing chat system
- **Referential Integrity:** Atomic operations with ACID guarantees

---

## Dependencies

**Required:**

- Convex backend deployed
- Existing chats/conversations table

**Blocking:**

- `context-injection` feature (requires project/thread data structures)
- `memory-system` feature (requires project/thread data structures)
- `project-ui` feature (requires CRUD APIs)

---

## Progress

- [ ] Convex Schema Design
- [ ] Database Migration Script
- [ ] Project CRUD API
- [ ] Project Search
- [ ] Thread Attachment API
- [ ] Thread Creation in Project
- [ ] Project Mention Tracking

See [progress.txt](./progress.txt) for detailed status.

---

## Related Features

- **context-injection:** NLP classifier, context builder, model router
- **memory-system:** Memory storage, embeddings, retrieval
- **project-ui:** Sidebar, chat view, @mention autocomplete
- **project-enablers:** Testing, documentation, feature flags

---

## Documentation

- [Spec](./spec.md) - Functional and non-functional requirements
- [Tasks](./tasks.md) - Implementation task breakdown
- [Plan](./plan.md) - Technical implementation plan
- [Checklist](./checklist.md) - Quality validation checklist

---

## Branch Convention

Feature branches should follow: `ralph/project-core-{story-name}`

Example: `ralph/project-core-project-crud-api`

---

## Contact

For questions or blockers related to this feature, please create an issue or contact the development team.
