# Feature Specification: Project UI Components

**Feature Branch**: `005-project-ui`
**Created**: 2026-01-23
**Status**: Design Phase
**Input**: User interface for hierarchical context management including sidebar, chat view, and attachment components
**Routing Preference**: auto: good | allow free: yes

---

## 1. Abstract

This specification defines the **Project UI Components**, providing the user interface for the hierarchical context management system. The UI enables users to create projects, organize threads, visualize context, and manage @mentions through an intuitive interface built with Radix UI primitives and Tailwind CSS.

---

## 2. User Scenarios & Testing _(mandatory)_

### User Story 1 - Hierarchical Sidebar Navigation (Priority: P1)

As a user, I want to see my projects and threads in a hierarchical sidebar so that I can navigate and organize my conversations visually.

**Why this priority**: Primary navigation interface. Without sidebar, users cannot access projects or threads. Essential for basic usability.

**Independent Test**: Can be tested by creating multiple projects with threads, then verifying the sidebar displays the correct hierarchy with expand/collapse functionality.

**Acceptance Scenarios**:

1. **Given** a user has 5 projects with threads, **When** sidebar renders, **Then** projects MUST be displayed with threads nested underneath
2. **Given** a project has 10+ threads, **When** displayed, **Then** threads MUST be scrollable within the project container
3. **Given** a user clicks a project header, **When** clicked, **Then** the project MUST toggle expand/collapse state
4. **Given** sidebar has 100+ projects, **When** rendered, **Then** virtualization MUST be used to maintain performance
5. **Given** a free chat thread exists, **When** sidebar renders, **Then** it MUST appear in a separate "Free Chats" section

---

### User Story 2 - Create Projects and Threads (Priority: P1)

As a user, I want to create new projects and threads through the UI so that I can organize my conversations without using APIs directly.

**Why this priority**: Core interaction. Users cannot use the project system without UI creation flows.

**Independent Test**: Can be tested by clicking "New Project" button, entering a name, and verifying the project appears in the sidebar.

**Acceptance Scenarios**:

1. **Given** a user clicks "New Project", **When** modal opens, **Then** input field MUST be focused and placeholder text shown
2. **Given** user enters project name, **When** they submit, **Then** project MUST appear in sidebar immediately (optimistic update)
3. **Given** project creation fails, **When** error occurs, **Then** error toast MUST appear and project MUST be removed from UI
4. **Given** user is in a project, **When** they click "New Thread", **Then** thread MUST be created under that project
5. **Given** user is on home screen, **When** they create thread, **Then** thread MUST be created as free chat (no project)

---

### User Story 3 - @Mention Autocomplete (Priority: P1)

As a user, I want autocomplete suggestions when typing @ so that I can easily reference projects without remembering exact names.

**Why this priority**: Key interaction for context injection. Without autocomplete, @mentions are error-prone and frustrating.

**Independent Test**: Can be tested by typing "@" in the input and verifying a dropdown appears with matching project names.

**Acceptance Scenarios**:

1. **Given** user types "@" in message input, **When** typed, **Then** autocomplete dropdown MUST appear with all projects
2. **Given** dropdown is open, **When** user types "Thes", **Then** list MUST filter to show only projects containing "Thes"
3. **Given** dropdown shows results, **When** user navigates with arrow keys, **Then** selection MUST move and highlight
4. **Given** a project is selected, **When** user presses Enter, **Then** "@ProjectName" MUST be inserted into input
5. **Given** no projects match filter, **When** user types, **Then** dropdown MUST show "No projects found" message

---

### User Story 4 - Attachment Banner (Priority: P2)

As a user, I want a suggestion banner when I mention a project in a free chat so that I can easily attach the conversation to the relevant project.

**Why this priority**: UX enhancement that improves organization. System works without it, but this drives adoption of project organization.

**Independent Test**: Can be tested by mentioning a project in a free chat and verifying the banner appears with attach/dismiss actions.

**Acceptance Scenarios**:

1. **Given** a free chat thread, **When** user types "@Thesis", **Then** banner MUST appear suggesting to attach to "Thesis" project
2. **Given** banner is showing, **When** user clicks "Attach", **Then** thread MUST move to project and banner MUST disappear
3. **Given** banner is showing, **When** user clicks dismiss, **Then** banner MUST hide and NOT reappear for same project in session
4. **Given** banner appears, **When** displayed, **Then** it MUST show project name and clear action buttons
5. **Given** thread is already in a project, **When** different project is mentioned, **Then** banner MUST suggest moving projects

---

### User Story 5 - Thread Management Actions (Priority: P2)

As a user, I want to rename, move, and delete threads through context menu actions so that I can manage my conversations after creation.

**Why this priority**: Important for ongoing organization but not critical for initial use. Users can create threads first, manage them later.

**Independent Test**: Can be tested by right-clicking a thread and selecting actions like "Rename" or "Move to Project".

**Acceptance Scenarios**:

1. **Given** user right-clicks a thread, **When** context menu opens, **Then** actions MUST include: Rename, Move to Project, Delete
2. **Given** user selects "Rename", **When** dialog opens, **Then** current name MUST be pre-filled and input focused
3. **Given** user selects "Move to Project", **When** project picker opens, **Then** all projects MUST be listed with search
4. **Given** user selects "Delete", **When** confirmation appears, **Then** thread MUST be soft-deleted with undo option
5. **Given** thread is moved, **When** operation completes, **Then** sidebar MUST refresh to show new location

---

### Edge Cases

- What happens when user has 500+ projects (sidebar performance)?
- How does UI handle very long project/thread names (text truncation)?
- What happens when project creation fails (network error)?
- How does autocomplete handle projects with identical names?
- What happens when attachment banner is dismissed but user mentions project again?
- How does UI render on mobile (responsive design)?

---

## 3. Requirements _(mandatory)_

### Functional Requirements

#### Sidebar Requirements

- **FR-001**: Sidebar MUST display hierarchical projects with nested threads
- **FR-002**: Projects MUST support expand/collapse state
- **FR-003**: Sidebar MUST support virtualization for 100+ projects
- **FR-004**: Free chats MUST appear in separate section from project threads
- **FR-005**: Sidebar MUST highlight active project/thread
- **FR-006**: Sidebar MUST persist expand/collapse state in localStorage

#### Project/Thread Creation

- **FR-007**: "New Project" button MUST open creation modal with input field
- **FR-008**: Project name MUST be validated (1-100 chars, no special chars)
- **FR-009**: Thread creation MUST respect current project context
- **FR-010**: Optimistic updates MUST be used for instant feedback
- **FR-011**: Failed operations MUST show error toast and revert UI state

#### @Mention Autocomplete

- **FR-012**: Typing "@" MUST trigger autocomplete dropdown
- **FR-013**: Dropdown MUST filter projects as user types
- **FR-014**: Dropdown MUST support keyboard navigation (arrows, enter, esc)
- **FR-015**: Selected project MUST insert "@ProjectName" at cursor position
- **FR-016**: Dropdown MUST show max 10 results with scroll if more
- **FR-017**: Fuzzy matching MUST find projects with typos

#### Attachment Banner

- **FR-018**: Banner MUST appear when project is mentioned in free chat
- **FR-019**: Banner MUST show project name and action buttons (Attach, Dismiss)
- **FR-020**: "Attach" MUST move thread to project and hide banner
- **FR-021**: "Dismiss" MUST hide banner for session duration
- **FR-022**: Banner MUST use Sonner toast for consistent notifications

#### Thread Management

- **FR-023**: Context menu MUST appear on right-click
- **FR-024**: Actions MUST include Rename, Move to Project, Delete
- **FR-025**: Rename MUST pre-fill current name
- **FR-026**: Move MUST show project picker with search
- **FR-027**: Delete MUST require confirmation with undo option

#### Chat View

- **FR-028**: Header MUST show current project name (if in project)
- **FR-029**: Header MUST show thread title and mode
- **FR-030**: Messages MUST display context indicators when memories were used
- **FR-031**: Message input MUST support @mention autocomplete

### Key Entities

- **SidebarState**: { expandedProjects: Set<projectId>, activeThread: threadId, activeProject: projectId }
- **AttachmentBannerState**: { showBanner: boolean, projectId: string, dismissed: boolean }
- **AutocompleteState**: { isOpen: boolean, query: string, selectedIndex: number, filteredProjects: Project[] }
- **ContextMenuState**: { isOpen: boolean, threadId: string, position: {x, y} }

---

## 4. Test Strategy (MANDATORY)

### Unit Test Approach

- Sidebar component rendering with project/thread hierarchy
- Expand/collapse state management
- Autocomplete filtering logic
- @Mention insertion at cursor position
- Attachment banner visibility logic

### Integration Test Scenarios

- Create project → verify appears in sidebar → persist across refresh
- Create thread in project → verify nested correctly → navigate to thread
- @Mention autocomplete → select project → verify inserted in input
- Mention project in free chat → verify banner appears → attach → verify thread moved

### Edge Case Tests

- 500+ projects in sidebar (virtualization)
- Very long project names (100+ chars)
- Duplicate project names in autocomplete
- Network errors during project creation (rollback)
- Mobile responsive layout (<768px width)
- Keyboard-only navigation (accessibility)

### Test Data Requirements

- Sample projects with various names (short, long, special chars)
- Thread hierarchies (projects with 0, 1, 10, 100 threads)
- User personas (new user, power user with 100+ projects)
- Edge case strings (unicode, emojis, very long names)
- Mock Convex responses for error states

---

## 5. Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 95% of users can create a project within 30 seconds of first login
- **SC-002**: 90% of users successfully use @mentions in their first session
- **SC-003**: Attachment suggestions result in 40% increase in project-organized threads
- **SC-004**: Sidebar renders 100+ projects without performance degradation (>60fps)
- **SC-005**: 100% of UI components pass accessibility audit (WCAG AA)
- **SC-006**: User satisfaction score >4.0/5.0 for UI usability

---

## 6. Component Structure

```
App
├── Sidebar
│   ├── ProjectList
│   │   ├── ProjectItem
│   │   │   ├── ProjectHeader (expand/collapse)
│   │   │   └── ThreadList (virtualized)
│   │   │       └── ThreadItem
│   │   └── AddProjectButton
│   └── FreeChatsList
│       └── ThreadItem
├── ChatView
│   ├── ChatHeader (project name, thread title)
│   ├── MessageList
│   │   ├── MessageItem
│   │   │   └── ContextIndicator (when memories used)
│   │   └── AttachmentBanner
│   └── InputArea
│       ├── TextArea
│       ├── MentionAutocomplete
│       └── SendButton
└── ContextMenu
    ├── RenameAction
    ├── MoveToProjectAction
    └── DeleteAction
```

---

**End of Specification**
