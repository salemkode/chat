# Implementation Tasks: Project UI Components

**Version:** 1.0
**Status:** Task Breakdown
**Date:** 2026-01-23

---

## Epic 1: Sidebar

### Story 1.1: Sidebar Project List

**Priority:** P0 | **Estimate:** 3 days

Tasks:

- [ ] Design component structure (Sidebar, ProjectList, ProjectItem, ThreadList, ThreadItem)
- [ ] Implement expand/collapse functionality
- [ ] Store collapse state in Jotai atom
- [ ] Fetch projects using listProjects query
- [ ] Display threads nested under projects
- [ ] Add "+ New Thread" button per project
- [ ] Style with Tailwind CSS

### Story 1.2: Project Creation UI

**Priority:** P0 | **Estimate:** 2 days

Tasks:

- [ ] Add "+ New Project" button
- [ ] Implement modal/inline form
- [ ] Validate project name
- [ ] Call createProject mutation
- [ ] Show success/error toasts
- [ ] Auto-expand new project
- [ ] Write E2E test

### Story 1.3: Thread Management UI

**Priority:** P0 | **Estimate:** 2 days

Tasks:

- [ ] Implement "+ New Thread" button
- [ ] Create context menu (right-click)
- [ ] Add rename, move, remove, delete actions
- [ ] Add confirmation dialogs
- [ ] Write E2E tests

### Story 1.4: Sidebar Virtualization

**Priority:** P2 | **Estimate:** 2 days

Tasks:

- [ ] Integrate react-window
- [ ] Measure performance before/after
- [ ] Test with 500+ projects
- [ ] Ensure expand/collapse works

---

## Epic 2: Chat View

### Story 2.1: Chat Header with Project Context

**Priority:** P0 | **Estimate:** 1 day

Tasks:

- [ ] Update ChatHeader component
- [ ] Display project name or "Free Chat"
- [ ] Add project icon/color
- [ ] Make project name clickable
- [ ] Style with Tailwind CSS

### Story 2.2: Attachment Banner UI

**Priority:** P0 | **Estimate:** 3 days

Tasks:

- [ ] Create AttachmentBanner component
- [ ] Display banner conditionally
- [ ] Implement "Attach" button logic
- [ ] Implement "Dismiss" button logic
- [ ] Animate entrance/exit
- [ ] Write E2E test

### Story 2.3: @Mention Autocomplete

**Priority:** P0 | **Estimate:** 3 days

Tasks:

- [ ] Detect @ trigger in InputArea
- [ ] Query matching projects
- [ ] Display autocomplete menu
- [ ] Support keyboard navigation
- [ ] Insert selected project
- [ ] Syntax highlight mentions
- [ ] Handle edge cases
- [ ] Write E2E test

### Story 2.4: Message Context Indicator

**Priority:** P2 | **Estimate:** 1 day

Tasks:

- [ ] Add badge to messages
- [ ] Show project name on hover
- [ ] Read from contextSnapshot metadata
- [ ] Style subtly

---

## Summary

**Total Epics:** 2
**Total Stories:** 8
**Estimated Duration:** 3 weeks

---
