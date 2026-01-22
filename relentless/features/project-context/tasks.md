# Implementation Tasks: Project-Scoped Context System

**Version:** 1.0  
**Status:** Task Breakdown  
**Date:** 2026-01-21

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

- [x] Implement `attachThreadToProject` mutation
  - [x] Validate thread and project exist
  - [x] Validate user owns both
  - [x] Update `thread.projectId`
  - [x] Update `project.lastActiveAt`
  - [x] Create audit log entry
- [x] Implement `detachThreadFromProject` mutation
  - [x] Set `thread.projectId = null`
  - [x] Update `project.lastActiveAt`
- [x] Implement `moveThreadToProject` mutation
  - [x] Detach from old project
  - [x] Attach to new project
  - [x] Handle edge cases (already attached, same project)
- [x] Write unit tests
- [x] Add transaction support (ensure atomicity)

**Acceptance Criteria:**

- [x] Thread attachment is atomic (no partial updates)
- [x] User can attach/detach threads successfully
- [x] Moving thread between projects updates both projects' `lastActiveAt`
- [x] Operations complete in <100ms

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

## Epic 4: Context Injection System

### Story 4.1: NLP Classifier Agent

**Priority:** P0 (Blocker)  
**Estimate:** 3 days

**Description:**
As the system, I need to detect @Project mentions in user messages so that I can inject project context.

**Tasks:**

- [ ] Implement `classifyMessage` action
- [ ] Write regex to extract @mentions: `/@([a-zA-Z0-9\s]+)/g`
- [ ] Query `projects` table to validate mentioned projects exist
- [ ] Return array of `{ projectId, projectName, startIndex, endIndex }`
- [ ] Implement intent classification (question/command/statement/code)
- [ ] Handle edge cases:
  - [ ] Multiple @mentions in one message
  - [ ] @mention of archived project
  - [ ] @mention of non-existent project
- [ ] Write unit tests with 20+ test cases
- [ ] Measure latency (target <50ms)

**Acceptance Criteria:**

- @Mentions detected with >99% accuracy
- Invalid project names return empty array (no error)
- Intent classification accuracy >90%
- Latency <50ms for messages up to 1000 chars

**Dependencies:** Story 2.1

---

### Story 4.2: Context Builder Agent

**Priority:** P0 (Blocker)  
**Estimate:** 4 days

**Description:**
As the system, I need to assemble ranked context from thread history and project memory so that the AI has relevant information.

**Tasks:**

- [ ] Implement `buildContext` action
- [ ] Fetch thread history (last 20 messages)
- [ ] Fetch project memory if thread attached to project
- [ ] Fetch project memory if @mentioned (even if not attached)
- [ ] Fetch pinned global memory
- [ ] Implement memory ranking function:
  ```
  rank = α * relevance + β * recency + γ * importance
  ```
- [ ] Truncate context to 8000 tokens (estimate: 4 chars = 1 token)
- [ ] Return context with metadata (sources, token count)
- [ ] Write unit tests for ranking logic
- [ ] Test with large context (100+ memories)

**Acceptance Criteria:**

- Context includes thread history + relevant memories
- Ranking function prioritizes project memory over profile memory
- Context truncation respects token limit
- Build time <200ms for threads with 1000 messages

**Dependencies:** Story 4.1, Epic 5 (Memory System)

---

### Story 4.3: Model Router Factory (Dynamic Agent Pattern)

**Priority:** P1 (High)  
**Estimate:** 2 days

**Description:**
As the system, I need to select the optimal AI model and return a configured `LanguageModel` instance for Dynamic Agent creation.

**Tasks:**

- [ ] Install `@convex-dev/agent`, `@ai-sdk/openai`, `@ai-sdk/anthropic`
- [ ] Implement `selectModel` factory function (not action, pure function)
- [ ] Import and configure language models from AI SDK:
  - [ ] `openai("gpt-4-turbo")` for code/learn/create modes
  - [ ] `anthropic("claude-3-opus-20240229")` for think mode
- [ ] Define model selection rules:
  - [ ] Code mode → GPT-4 Turbo (temp 0.2, maxTokens 8000)
  - [ ] Learn mode → GPT-4 Turbo (temp 0.5, maxTokens 4000)
  - [ ] Think mode → Claude 3 Opus (temp 0.8, maxTokens 4000)
  - [ ] Create mode → GPT-4 Turbo (temp 0.9, maxTokens 6000)
- [ ] Adjust for long context (>6000 tokens → Claude)
- [ ] Return `{ languageModel: LanguageModel, maxTokens, temperature }`
- [ ] Write unit tests for all mode combinations
- [ ] Document model selection logic

**Acceptance Criteria:**

- Returns configured `LanguageModel` instance (not string)
- Model selection is deterministic given same inputs
- Long context triggers Claude selection
- Selection completes in <10ms
- Compatible with Convex Dynamic Agent API

**Dependencies:** Story 4.2

---

### Story 4.4: Main Inference Agent (Dynamic Agent)

**Priority:** P0 (Blocker)  
**Estimate:** 4 days

**Description:**
As the system, I need to create a Dynamic Agent that generates AI responses using the selected model with assembled context and project-specific tools.

**Tasks:**

- [ ] Implement `createInferenceAgent` factory function
  - [ ] Accept `ctx`, `threadId`, `projectId`, `userId`, `languageModel`, `mode`
  - [ ] Define mode-specific instructions (code/learn/think/create)
  - [ ] Create tools:
    - [ ] `searchMemories` - Search project memories
    - [ ] `getThreadContext` - Get recent thread messages
  - [ ] Return new `Agent(components.agent, { ... })` instance
  - [ ] Set `maxSteps: 3` to limit multi-step reasoning
- [ ] Implement `sendMessage` action
  - [ ] Get thread info
  - [ ] Call NLP Classifier
  - [ ] Call Context Builder
  - [ ] Call Model Router to get `languageModel`
  - [ ] Create Inference Agent with `languageModel`
  - [ ] Run agent with context + user message
  - [ ] Store user and assistant messages
  - [ ] Store `contextSnapshot` in message metadata
  - [ ] Async: Extract memories (non-blocking)
  - [ ] Async: Determine banner state
- [ ] Add error handling (context build failure → fallback to thread-only)
- [ ] Write integration tests
- [ ] Measure end-to-end latency (target <2s for full pipeline)

**Acceptance Criteria:**

- @Mention in message triggers project memory injection
- AI response reflects project context
- Dynamic Agent uses correct model per mode
- Agent can use tools to search memories/context
- Context snapshot stored in message metadata
- Pipeline failure does not crash message send
- Latency <2s end-to-end

**Dependencies:** Story 4.1, Story 4.2, Story 4.3

---

## Epic 5: Memory System

### Story 5.1: Memory Storage API

**Priority:** P0 (Blocker)  
**Estimate:** 2 days

**Description:**
As the system, I need to store memories with embeddings so that I can retrieve them later.

**Tasks:**

- [ ] Implement `createMemory` mutation
  - [ ] Accept `content`, `scope`, `scopeId`, `embedding`
  - [ ] Validate embedding dimensions (1536 for `text-embedding-3-small`)
  - [ ] Set initial scores (recency=1.0, importance=0.5)
  - [ ] Return memory ID
- [ ] Implement `listMemories` query
  - [ ] Filter by `userId`, `scope`, `scopeId`
  - [ ] Support pagination
- [ ] Implement `deleteMemory` mutation (for future manual editing)
- [ ] Write unit tests

**Acceptance Criteria:**

- Memories stored with correct scope
- Embeddings validated before storage
- List query returns memories sorted by `createdAt` (descending)

**Dependencies:** Story 1.1

---

### Story 5.2: Memory Embedding Generation

**Priority:** P0 (Blocker)  
**Estimate:** 2 days

**Description:**
As the system, I need to generate embeddings for memory content so that I can perform semantic search.

**Tasks:**

- [ ] Implement `generateEmbedding` helper function
- [ ] Call OpenAI Embeddings API (`text-embedding-3-small`)
- [ ] Handle API errors (retry logic, fallback)
- [ ] Cache embeddings for identical content (optional optimization)
- [ ] Write unit tests
- [ ] Measure latency (target <200ms per embedding)

**Acceptance Criteria:**

- Embedding generation succeeds for valid content
- API errors handled gracefully (return null or retry)
- Latency <200ms per embedding

**Dependencies:** None

---

### Story 5.3: Memory Retrieval and Ranking

**Priority:** P0 (Blocker)  
**Estimate:** 3 days

**Description:**
As the system, I need to retrieve and rank memories by relevance, recency, and importance.

**Tasks:**

- [ ] Implement `rankMemories` helper function
- [ ] Use Convex vector index for nearest neighbor search
- [ ] Implement ranking formula:
  ```
  rank = 0.5 * relevance + 0.3 * recency + 0.2 * importance
  ```
- [ ] Recency calculation: `exp(-ageInDays / 30)`
- [ ] Return top K memories (K=10 by default)
- [ ] Write unit tests with synthetic data
- [ ] Test with 10k+ memories

**Acceptance Criteria:**

- Vector search returns relevant memories
- Ranking prioritizes recent + relevant memories
- Retrieval completes in <100ms for 10k memories

**Dependencies:** Story 5.1, Story 5.2

---

### Story 5.4: Memory Manager Agent (Dynamic Agent)

**Priority:** P0 (Blocker)  
**Estimate:** 4 days

**Description:**
As the system, I need to automatically extract and store memories from conversations using a Dynamic Agent with LLM-powered fact extraction.

**Tasks:**

- [ ] Implement `createMemoryAgent` factory function
  - [ ] Create tools:
    - [ ] `extractFacts` - Extract key statements from conversation
    - [ ] `generateEmbedding` - Generate vector embedding using AI SDK
    - [ ] `storeMemory` - Store memory in database with correct scope
  - [ ] Set `languageModel: openai("gpt-4-turbo")`
  - [ ] Define instructions for fact extraction rules
  - [ ] Set `maxSteps: 10`
- [ ] Implement `extractAndStoreMemories` action
  - [ ] Create Memory Agent instance
  - [ ] Run agent with user + assistant messages
  - [ ] Extract tool calls to count stored memories
  - [ ] Return `{ memoriesCreated, memoryIds }`
- [ ] Prompt engineering for fact extraction (in agent instructions):
  ```
  Extract only factual, verifiable statements.
  Ignore pleasantries and non-informative content.
  Generate embeddings for each fact.
  Store in appropriate scope (project or thread).
  ```
- [ ] Handle extraction failures gracefully
- [ ] Write unit tests
- [ ] Measure accuracy (manual review of 100 conversations)

**Acceptance Criteria:**

- Memories extracted with >80% relevance (manual validation)
- Extraction completes in <5s per conversation turn
- Failures do not block message send
- Dynamic Agent uses tools correctly (extract → embed → store)

**Dependencies:** Story 5.1, Story 5.2, Story 5.3

---

## Epic 6: Frontend - Sidebar

### Story 6.1: Hierarchical Sidebar Layout

**Priority:** P0 (Blocker)  
**Estimate:** 3 days

**Description:**
As a user, I want to see projects and threads in a hierarchical sidebar so that I can organize my conversations.

**Tasks:**

- [ ] Design component structure:
  - [ ] `Sidebar` (container)
  - [ ] `ProjectList` (renders projects)
  - [ ] `ProjectItem` (single project with threads)
  - [ ] `ThreadList` (renders threads in project)
  - [ ] `ThreadItem` (single thread)
  - [ ] `FreeChatsList` (threads without project)
- [ ] Implement expand/collapse functionality per project
- [ ] Store collapse state in Jotai atom (`sidebarCollapsedAtom`)
- [ ] Implement drag-and-drop (optional for MVP)
- [ ] Add "+ New Thread" button per project
- [ ] Style with Tailwind CSS
- [ ] Make responsive (collapse on mobile)

**Acceptance Criteria:**

- Sidebar renders projects with nested threads
- Expand/collapse state persists across sessions (localStorage)
- Clicking thread activates it in main view
- UI matches design mockup

**Dependencies:** Story 2.1, Story 3.1

---

### Story 6.2: Project Creation UI

**Priority:** P0 (Blocker)  
**Estimate:** 2 days

**Description:**
As a user, I want to create a new project from the sidebar so that I can organize my threads.

**Tasks:**

- [ ] Add "+ New Project" button to sidebar
- [ ] Implement modal/inline form for project name input
- [ ] Validate name (max 50 chars, no duplicates)
- [ ] Call `createProject` mutation on submit
- [ ] Show success/error toast
- [ ] Auto-expand new project in sidebar
- [ ] Write E2E test for project creation flow

**Acceptance Criteria:**

- Users can create projects with 2 clicks
- Invalid names show inline error
- New project appears in sidebar immediately (real-time update)

**Dependencies:** Story 2.1, Story 6.1

---

### Story 6.3: Thread Management UI

**Priority:** P0 (Blocker)  
**Estimate:** 2 days

**Description:**
As a user, I want to create threads within projects and rename/delete threads.

**Tasks:**

- [ ] Implement "+ New Thread" button in `ProjectItem`
- [ ] Call `createThreadInProject` mutation
- [ ] Implement thread context menu (right-click):
  - [ ] Rename thread
  - [ ] Move to project (if free chat)
  - [ ] Remove from project (if in project)
  - [ ] Delete thread
- [ ] Add confirmation dialog for destructive actions
- [ ] Write E2E tests

**Acceptance Criteria:**

- Users can create threads in projects with 1 click
- Context menu actions work correctly
- Deletion requires confirmation

**Dependencies:** Story 3.1, Story 3.2, Story 6.1

---

### Story 6.4: Sidebar Virtualization

**Priority:** P2 (Nice to have)  
**Estimate:** 2 days

**Description:**
As a user with 100+ projects, I want the sidebar to remain performant.

**Tasks:**

- [ ] Integrate `react-window` for project list
- [ ] Measure render performance before/after
- [ ] Test with 500+ projects
- [ ] Ensure expand/collapse still works

**Acceptance Criteria:**

- Sidebar renders 500 projects with <50ms lag
- Scrolling is smooth (60fps)

**Dependencies:** Story 6.1

---

## Epic 7: Frontend - Chat View

### Story 7.1: Chat Header with Project Context

**Priority:** P0 (Blocker)  
**Estimate:** 1 day

**Description:**
As a user, I want to see which project (if any) the current thread belongs to.

**Tasks:**

- [ ] Update `ChatHeader` component
- [ ] Display project name if `thread.projectId` is set
- [ ] Display "Free Chat" if no project
- [ ] Add project icon/color (optional)
- [ ] Make project name clickable (navigate to project in sidebar)
- [ ] Style with Tailwind CSS

**Acceptance Criteria:**

- Chat header shows project name for project threads
- Chat header shows "Free Chat" for free threads
- UI is visually distinct for project vs. free chats

**Dependencies:** Story 3.1

---

### Story 7.2: Attachment Banner UI

**Priority:** P0 (Blocker)  
**Estimate:** 3 days

**Description:**
As a user, I want to see a banner prompting me to attach the thread to a project after I mention it.

**Tasks:**

- [ ] Create `AttachmentBanner` component
- [ ] Display banner after AI response if:
  - [ ] User mentioned @Project in last message
  - [ ] Thread is not attached to that project
  - [ ] Banner was not dismissed for this mention
- [ ] Show two buttons: "Attach" and "Dismiss"
- [ ] "Attach" button:
  - [ ] Call `attachThreadToProject` mutation
  - [ ] Update `projectMention.attachmentAccepted = true`
  - [ ] Close banner
- [ ] "Dismiss" button:
  - [ ] Update `projectMention.attachmentAccepted = false`
  - [ ] Close banner
- [ ] Animate banner entrance/exit
- [ ] Write E2E test for attachment flow

**Acceptance Criteria:**

- Banner appears immediately after AI response to @mention
- "Attach" button attaches thread and closes banner
- "Dismiss" button closes banner without attachment
- Dismissed banners do not reappear for same mention

**Dependencies:** Story 4.4, Story 3.1, Epic 8 (UX State Agent)

---

### Story 7.3: @Mention Autocomplete

**Priority:** P0 (Blocker)  
**Estimate:** 3 days

**Description:**
As a user, I want autocomplete suggestions when I type @ so that I can easily mention projects.

**Tasks:**

- [ ] Detect `@` trigger in `InputArea` component
- [ ] Query projects matching partial name
- [ ] Display autocomplete menu with project list
- [ ] Support keyboard navigation (up/down arrows, Enter)
- [ ] Insert selected project name on selection
- [ ] Syntax highlight @mentions in input (optional)
- [ ] Handle edge cases (no matching projects, archived projects)
- [ ] Write E2E test

**Acceptance Criteria:**

- Autocomplete appears within 50ms of typing `@`
- Keyboard navigation works correctly
- Selected project name inserted with space after
- Archived projects excluded from autocomplete

**Dependencies:** Story 2.1

---

### Story 7.4: Message Context Indicator

**Priority:** P2 (Nice to have)  
**Estimate:** 1 day

**Description:**
As a user, I want to see which project context was active when a message was sent (for debugging).

**Tasks:**

- [ ] Display small badge on messages that used project context
- [ ] Badge shows project name on hover
- [ ] Read from `message.metadata.contextSnapshot`
- [ ] Style subtly (low visual weight)

**Acceptance Criteria:**

- Badge appears on messages with project context
- Hover shows project name
- Badge does not clutter message UI

**Dependencies:** Story 4.4

---

## Epic 8: UX State Management

### Story 8.1: UX State Agent

**Priority:** P0 (Blocker)  
**Estimate:** 2 days

**Description:**
As the system, I need to determine when to show attachment banners and manage UI state.

**Tasks:**

- [ ] Implement `determineBannerState` action
- [ ] Check if thread already attached to mentioned project (no banner)
- [ ] Check if banner already dismissed for this mention (no banner)
- [ ] Handle multiple @mentions (show banner for first unattached project)
- [ ] Return `{ showBanner, bannerProjectId, bannerMessage }`
- [ ] Write unit tests for all edge cases

**Acceptance Criteria:**

- Banner logic is deterministic
- Edge cases handled correctly (see spec.md EC-1 to EC-6)
- Action completes in <50ms

**Dependencies:** Story 4.1, Story 3.1

---

### Story 8.2: Project Mention Tracking

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

## Epic 9: Testing and QA

### Story 9.1: Unit Test Suite

**Priority:** P0 (Blocker)  
**Estimate:** 3 days

**Description:**
As an engineer, I need comprehensive unit tests for all agents and core logic.

**Tasks:**

- [ ] Write tests for NLP Classifier Agent (20+ cases)
- [ ] Write tests for Context Builder Agent (15+ cases)
- [ ] Write tests for Memory Manager Agent (10+ cases)
- [ ] Write tests for UX State Agent (10+ cases)
- [ ] Write tests for memory ranking function (5+ cases)
- [ ] Achieve >80% code coverage
- [ ] Set up CI to run tests on every commit

**Acceptance Criteria:**

- All tests pass
- Code coverage >80%
- CI pipeline passes

**Dependencies:** All agent stories

---

### Story 9.2: Integration Test Suite

**Priority:** P0 (Blocker)  
**Estimate:** 2 days

**Description:**
As an engineer, I need integration tests to verify end-to-end flows.

**Tasks:**

- [ ] Test: Create project → Create thread → Send message → Verify context
- [ ] Test: Send @mention → Verify banner → Click "Attach" → Verify thread moves
- [ ] Test: Archive project → Verify not in autocomplete
- [ ] Write tests using Convex test utilities
- [ ] Run tests in CI

**Acceptance Criteria:**

- All integration tests pass
- Tests cover happy path + edge cases

**Dependencies:** All Epic 1-8 stories

---

### Story 9.3: E2E Test Suite

**Priority:** P1 (High)  
**Estimate:** 3 days

**Description:**
As a QA engineer, I need E2E tests to verify UI interactions.

**Tasks:**

- [ ] Set up Playwright for E2E testing
- [ ] Test: User creates project from sidebar
- [ ] Test: User types @Project and selects from autocomplete
- [ ] Test: User sees attachment banner and clicks "Attach"
- [ ] Test: User drags thread from "Chats" to project
- [ ] Run E2E tests in CI
- [ ] Record test videos for debugging

**Acceptance Criteria:**

- All E2E tests pass in headless mode
- Tests run in <5 minutes
- CI pipeline includes E2E tests

**Dependencies:** All Epic 6-7 stories

---

### Story 9.4: Performance Testing

**Priority:** P1 (High)  
**Estimate:** 2 days

**Description:**
As an engineer, I need to verify the system meets performance requirements.

**Tasks:**

- [ ] Load test: 10k threads, 100k memories
- [ ] Measure context build latency (target <200ms)
- [ ] Measure memory retrieval latency (target <100ms)
- [ ] Measure sidebar render time with 100+ projects (target <50ms)
- [ ] Use Convex benchmarking tools
- [ ] Document results in `progress.txt`

**Acceptance Criteria:**

- All NFRs met (see spec.md NFR-1)
- No memory leaks in frontend
- Performance report generated

**Dependencies:** All Epic 1-8 stories

---

## Epic 10: Documentation and Rollout

### Story 10.1: User Documentation

**Priority:** P1 (High)  
**Estimate:** 2 days

**Description:**
As a user, I want documentation explaining how to use projects and @mentions.

**Tasks:**

- [ ] Write user guide: "Getting Started with Projects"
- [ ] Write tutorial: "Using @Mentions to Inject Context"
- [ ] Create video walkthrough (2-3 minutes)
- [ ] Add in-app tooltips for first-time users
- [ ] Publish documentation to help center

**Acceptance Criteria:**

- Documentation covers all user-facing features
- Video demonstrates key workflows
- In-app tooltips guide new users

**Dependencies:** All Epic 6-7 stories

---

### Story 10.2: Developer Documentation

**Priority:** P1 (High)  
**Estimate:** 1 day

**Description:**
As a developer, I want documentation for the agent architecture and APIs.

**Tasks:**

- [ ] Document agent architecture (diagram + text)
- [ ] Document Convex schema and indexes
- [ ] Document memory ranking algorithm
- [ ] Add JSDoc comments to all public functions
- [ ] Generate API reference with TypeDoc
- [ ] Publish to internal wiki

**Acceptance Criteria:**

- All agents documented with examples
- Schema diagram generated
- API reference auto-generated from JSDoc

**Dependencies:** All Epic 1-8 stories

---

### Story 10.3: Feature Flags and Rollout

**Priority:** P0 (Blocker)  
**Estimate:** 2 days

**Description:**
As a product manager, I want to roll out this feature gradually to mitigate risk.

**Tasks:**

- [ ] Implement feature flags:
  - [ ] `enable_projects`
  - [ ] `enable_context_injection`
  - [ ] `enable_memory_extraction`
  - [ ] `enable_attachment_banners`
- [ ] Roll out to internal users (week 1-2)
- [ ] Roll out to 10% of users (week 3-4)
- [ ] Roll out to 50% of users (week 5)
- [ ] Roll out to 100% of users (week 6)
- [ ] Monitor error rates and performance metrics
- [ ] Set up alerts for critical failures

**Acceptance Criteria:**

- Feature flags work correctly
- Rollout completes without major incidents
- Monitoring dashboards show healthy metrics

**Dependencies:** All Epic 1-8 stories

---

### Story 10.4: Post-Launch Monitoring

**Priority:** P0 (Blocker)  
**Estimate:** Ongoing

**Description:**
As an engineer, I need to monitor the system in production to catch issues early.

**Tasks:**

- [ ] Set up Convex analytics dashboard
- [ ] Track key metrics:
  - [ ] Context build latency (p50, p99)
  - [ ] Memory retrieval latency (p50, p99)
  - [ ] Attachment banner conversion rate
  - [ ] Project creation rate
- [ ] Set up alerts for:
  - [ ] Context build failures >1%
  - [ ] Memory retrieval timeouts >0.1%
  - [ ] Sidebar render time >100ms
- [ ] Weekly review of metrics
- [ ] Document findings in `progress.txt`

**Acceptance Criteria:**

- Dashboard shows real-time metrics
- Alerts trigger for anomalies
- Weekly review completed

**Dependencies:** Story 10.3

---

## Summary

**Total Epics:** 10  
**Total Stories:** 35  
**Estimated Duration:** 6 weeks (assuming 2 engineers full-time)

**Critical Path:**

1. Epic 1: Data Layer Foundation (Week 1)
2. Epic 2-3: Project & Thread Management (Week 2)
3. Epic 4: Context Injection System (Week 3-4)
4. Epic 5: Memory System (Week 3-4, parallel with Epic 4)
5. Epic 6-7: Frontend (Week 5)
6. Epic 8-9: UX State & Testing (Week 6)
7. Epic 10: Documentation & Rollout (Week 6)

**Risk Mitigation:**

- Memory extraction accuracy (<80%) → Manual curation tool as fallback
- Context build latency (>200ms) → Implement aggressive caching
- Sidebar performance (>100 projects) → Implement virtualization early

---

**End of Tasks Document**
