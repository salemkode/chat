# Relentless Features

This directory contains feature specifications for the Project Context System, split into focused, manageable modules.

---

## Feature Structure

### 1. project-core

**Focus:** Core data layer, project CRUD, thread operations

**User Stories:** 7
**Estimated Duration:** 2 weeks
**Status:** 🚧 In Progress

**Key Components:**

- Convex schema design
- Database migration
- Project CRUD API
- Project search
- Thread attachment API
- Thread creation in projects
- Project mention tracking

**Dependencies:** None (foundational)
**Blocking:** context-injection, memory-system, project-ui

---

### 2. context-injection

**Focus:** NLP classification, context building, model routing, inference agents

**User Stories:** 5
**Estimated Duration:** 3 weeks
**Status:** 🚧 Not Started

**Key Components:**

- NLP Classifier Agent (@mention detection, intent classification)
- Context Builder Agent (assemble ranked context)
- Model Router Factory (select optimal AI model)
- Main Inference Agent (Dynamic Agent with tools)
- UX State Agent (attachment banner logic)

**Dependencies:** project-core
**Blocking:** project-ui

---

### 3. memory-system

**Focus:** Memory storage, embeddings, retrieval, LLM-powered fact extraction

**User Stories:** 4
**Estimated Duration:** 2.5 weeks
**Status:** 🚧 Not Started

**Key Components:**

- Memory Storage API
- Memory Embedding Generation (OpenAI)
- Memory Retrieval and Ranking (vector search)
- Memory Manager Agent (Dynamic Agent for fact extraction)

**Dependencies:** project-core
**Blocking:** context-injection

---

### 4. project-ui

**Focus:** Sidebar, chat view, @mention autocomplete, attachment banners

**User Stories:** 8
**Estimated Duration:** 3 weeks
**Status:** 🚧 Not Started

**Key Components:**

- Sidebar Project List (hierarchical display)
- Project Creation UI
- Thread Management UI (context menus)
- Sidebar Virtualization (performance)
- Chat Header with Project Context
- Attachment Banner UI
- @Mention Autocomplete
- Message Context Indicator

**Dependencies:** project-core, context-injection
**Blocking:** None (UI layer)

---

### 5. project-enablers

**Focus:** Testing, documentation, feature flags, monitoring

**User Stories:** 8
**Estimated Duration:** Ongoing (2-3 weeks initial)
**Status:** 🚧 Not Started

**Key Components:**

- Unit Test Suite (Vitest + convex-test)
- Integration Test Suite
- E2E Test Suite (Playwright)
- Performance Testing
- User Documentation (guides, tutorials, videos)
- Developer Documentation (architecture, API reference)
- Feature Flags and Rollout
- Post-Launch Monitoring

**Dependencies:** All other features
**Blocking:** None (enabling feature)

---

## Feature Dependencies

```
project-core (foundation)
    ↓
    ├─→ context-injection ←─┐
    │                      │
    └─→ memory-system ─────┤
                           │
                           ↓
                      project-ui
                           │
                           ↓
                      project-enablers
```

---

## Total Project Scope

**Total Features:** 5
**Total User Stories:** 32
**Total Estimated Duration:** 10-12 weeks (with parallel development)

**Critical Path:**

1. project-core (Week 1-2)
2. context-injection + memory-system (Week 3-5, parallel)
3. project-ui (Week 4-7, overlaps with backend)
4. project-enablers (Ongoing, starts Week 3)

---

## Quick Reference

| Feature           | Stories | Duration  | Priority | Dependencies                    |
| ----------------- | ------- | --------- | -------- | ------------------------------- |
| project-core      | 7       | 2 weeks   | P0       | None                            |
| context-injection | 5       | 3 weeks   | P0       | project-core                    |
| memory-system     | 4       | 2.5 weeks | P0       | project-core                    |
| project-ui        | 8       | 3 weeks   | P0       | project-core, context-injection |
| project-enablers  | 8       | Ongoing   | P1       | All features                    |

---

## Working with Features

Each feature directory contains:

- `prd.json` - Product requirements with user stories
- `prd.md` - Human-readable product requirements
- `spec.md` - Technical specification
- `tasks.md` - Implementation task breakdown
- `plan.md` - Technical implementation plan
- `checklist.md` - Quality validation checklist
- `progress.txt` - Progress log
- `README.md` - Feature overview

---

## Branch Naming Convention

Feature branches should follow: `ralph/{feature-name}-{story-name}`

Examples:

- `ralph/project-core-schema-design`
- `ralph/context-injection-nlp-classifier`
- `ralph/memory-system-storage-api`
- `ralph/project-ui-sidebar-projects`
- `ralph/project-enablers-unit-tests`

---

## Migration from Original Feature

The original `project-context` feature was split on 2026-01-23 into 5 focused features for better manageability and parallel development.

**Mapping:**

- Epic 1-3, 8 → project-core
- Epic 4 → context-injection
- Epic 5 → memory-system
- Epic 6-7 → project-ui
- Epic 9-10 → project-enablers

---

**Last Updated:** 2026-01-23
