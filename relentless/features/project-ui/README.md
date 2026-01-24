# Project UI Components

**Status:** 🚧 Not Started
**Priority:** P0 (Blocker)
**Estimated Duration:** 3 weeks

---

## Overview

Project UI provides all user interface components for the hierarchical context management system, including sidebar navigation, chat view enhancements, @mention autocomplete, and attachment banners.

---

## Key Features

### Sidebar

- **Project List:** Hierarchical display of projects and threads
- **Project Creation:** Quick project creation modal
- **Thread Management:** Create, rename, move, delete threads
- **Virtualization:** Performant rendering for 100+ projects

### Chat View

- **Chat Header:** Shows project context indicator
- **Attachment Banner:** Prompt users to attach threads after @mention
- **@Mention Autocomplete:** Quick project mention with keyboard navigation
- **Context Indicator:** Badge showing which project context was used

---

## Dependencies

**Required:**

- `project-core` feature (CRUD APIs)
- `context-injection` feature (UX state agent)
- React, TanStack Start, Jotai
- Tailwind CSS

**Blocking:**

- None (UI layer can be developed in parallel with backend)

---

## Progress

- [ ] Sidebar Project List
- [ ] Project Creation UI
- [ ] Thread Management UI
- [ ] Sidebar Virtualization
- [ ] Chat Header with Project Context
- [ ] Attachment Banner UI
- [ ] @Mention Autocomplete
- [ ] Message Context Indicator

See [progress.txt](./progress.txt) for detailed status.

---

## Related Features

- **project-core:** Backend APIs
- **context-injection:** UX state management
- **memory-system:** Memory display (future)
- **project-enablers:** Testing

---

## Branch Convention

Feature branches should follow: `ralph/project-ui-{component-name}`

Example: `ralph/project-ui-sidebar-projects`

---
