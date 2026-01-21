# Feature Specification: Hierarchical Context Management System for Human-AI Interaction

**Version:** 1.0  
**Status:** Design Phase  
**Author:** Relentless Systems Architecture  
**Date:** 2026-01-21

---

## 1. Abstract

This specification defines a **Hierarchical Context Management System** for multi-agent AI platforms. The system introduces **Projects** as first-class context containers that organize conversational threads, manage scoped memory, and enable explicit context injection through mention-based interaction patterns. This architecture addresses fundamental limitations in flat chat-list interfaces by providing cognitive workspace segmentation, reducing context pollution, and enabling scalable long-term memory systems.

The system is grounded in cognitive load theory, workspace models from HCI research, and hierarchical memory architectures. It is designed for production deployment on Convex-based multi-model AI systems with TypeScript/React frontends.

---

## 2. Conceptual Model

### 2.1 Core Entities

#### **Project**

A Project is a **bounded context container** that encapsulates:

- A semantic domain (e.g., "Graduation Thesis", "Product Feature X")
- Project-scoped memory
- Associated threads
- Project-level metadata (creation date, importance score, archived state)

**Formal Definition:**

```
Project = {
  id: UUID,
  name: String,
  memory: MemorySet,
  threads: Set<Thread>,
  metadata: ProjectMetadata
}
```

**Properties:**

- Projects are user-created and user-managed
- Projects persist independently of threads
- Projects can exist without threads (empty workspace)
- Projects can be archived but not deleted (memory preservation)

#### **Thread**

A Thread is a **sequential conversation history** between user and AI agent(s).

**Formal Definition:**

```
Thread = {
  id: UUID,
  messages: List<Message>,
  projectId: Optional<UUID>,
  context: ComputedContext,
  createdAt: Timestamp,
  lastActiveAt: Timestamp
}
```

**Properties:**

- Threads may belong to zero or one Project
- Thread context is computed dynamically from:
  - Thread message history
  - (Optional) Project memory if `projectId` is set
  - (Optional) Pinned global memory
  - Mode-specific system prompts
- Threads without `projectId` are "free chats"

#### **Chat**

A Chat is a **UI-level representation** of a Thread. The term "Chat" refers to the user-facing interface element, while "Thread" refers to the underlying data structure.

**Distinction:**

- Chat = UI presentation layer
- Thread = Data/logic layer

#### **Memory**

Memory is a **typed knowledge artifact** stored at various scopes.

**Formal Definition:**

```
Memory = {
  id: UUID,
  scope: MemoryScope,
  content: String,
  vector: Embedding,
  relevanceScore: Float,
  recencyScore: Float,
  importanceScore: Float,
  createdAt: Timestamp
}

MemoryScope = Profile | Skill | Project | Thread | Pinned
```

**Memory Hierarchy:**

1. **Profile Memory:** User-level persistent knowledge
2. **Skill Memory:** Capability-specific knowledge
3. **Project Memory:** Project-scoped context
4. **Thread Memory:** Thread-local ephemeral knowledge
5. **Pinned Memory:** Explicitly marked for global injection

#### **Context**

Context is the **computed information environment** presented to the AI agent during inference.

**Formal Definition:**

```
Context = ThreadHistory ⊕ ProjectMemory ⊕ PinnedMemory ⊕ ModePrompt

where ⊕ denotes ranked concatenation with token limits
```

**Context Computation:**

```
function computeContext(thread: Thread): Context {
  let context = []

  // 1. Thread history (always included)
  context.push(thread.messages.slice(-N))

  // 2. Project memory (if thread is attached to project)
  if (thread.projectId) {
    const projectMemories = rankMemories(
      getProjectMemories(thread.projectId),
      thread.messages[-1].content
    )
    context.push(projectMemories.slice(0, K))
  }

  // 3. Pinned global memory (user-controlled)
  const pinnedMemories = getPinnedMemories()
  context.push(pinnedMemories)

  // 4. Mode-specific system prompt
  context.push(getModePrompt(thread.mode))

  return rankAndTruncate(context, TOKEN_LIMIT)
}
```

---

### 2.2 System Boundaries

**In Scope:**

- Project creation, renaming, archival
- Thread creation within or outside projects
- Explicit project attachment via `@Project` mentions
- Dynamic context injection based on thread-project association
- Hierarchical sidebar rendering
- Project-scoped memory retrieval
- User-controlled thread-to-project assignment

**Out of Scope (Future Work):**

- Cross-project memory retrieval
- Automatic project suggestion
- Project templates or cloning
- Multi-project thread association
- Project sharing or collaboration
- Project-level permissions

---

## 3. Research Framing

### 3.1 Cognitive Workspace Theory

This system is grounded in **workspace models** from cognitive science and HCI:

**Problem Statement:**
Flat chat lists create **context pollution** where unrelated conversations compete for cognitive attention and memory retrieval accuracy degrades as the system scales.

**Solution Framework:**
Projects act as **cognitive workspaces** that:

1. Segment attention (fewer items per workspace)
2. Scope memory retrieval (bounded search space)
3. Provide semantic anchoring (workspace = semantic domain)

**Theoretical Foundation:**

- Miller's Law (7±2 items in working memory)
- Hierarchical organization reduces cognitive load (Card, Moran, Newell 1983)
- Context-dependent memory retrieval (Tulving & Thomson 1973)

### 3.2 Hierarchical Memory Architecture

The system implements a **multi-tiered memory model**:

```
┌─────────────────┐
│ Pinned Memory   │ (Always active)
├─────────────────┤
│ Project Memory  │ (Active when thread ∈ project)
├─────────────────┤
│ Thread Memory   │ (Active for current thread)
├─────────────────┤
│ Profile Memory  │ (Background context)
└─────────────────┘
```

**Memory Ranking Function:**

```
rank(memory, query) = α·relevance(memory, query)
                    + β·recency(memory)
                    + γ·importance(memory)
```

Where α, β, γ are learned or configured weights.

### 3.3 Human-AI Interaction Rationale

**Design Principle: Explicit Over Implicit**

The system uses **mention-based context injection** (`@Project`) rather than automatic project detection because:

1. **Transparency:** Users understand what context is active
2. **Control:** Users decide when to invoke project memory
3. **Predictability:** AI behavior is deterministic given explicit context
4. **Error Reduction:** No false-positive project association

**Interaction Flow:**

```
User types @ProjectName → System detects mention → Context Builder injects project memory → AI responds with project context → System prompts user to attach thread to project
```

This creates a **progressive disclosure** pattern:

1. User explores with @mention (low commitment)
2. System demonstrates value (contextualized response)
3. User confirms association (high commitment)

---

## 4. Functional Requirements

### FR-1: Project Management

**FR-1.1** Users MUST be able to create new projects with a user-specified name.

**FR-1.2** Users MUST be able to rename existing projects.

**FR-1.3** Users MUST be able to archive projects (soft delete).

**FR-1.4** Archived projects MUST retain all memory and thread associations.

**FR-1.5** Projects MUST persist independently of thread lifecycle.

### FR-2: Thread Management

**FR-2.1** Users MUST be able to create threads within a project.

**FR-2.2** Users MUST be able to create threads outside of any project (free chats).

**FR-2.3** Users MUST be able to manually assign a thread to a project.

**FR-2.4** Users MUST be able to remove a thread from a project (convert to free chat).

**FR-2.5** Threads MUST belong to at most one project at any time.

### FR-3: Context Injection

**FR-3.1** When a user types `@ProjectName` in a message, the system MUST inject project memory into the context for that inference.

**FR-3.2** After the AI responds to a message containing `@ProjectName`, the system MUST display a banner prompting the user to attach the thread to the project.

**FR-3.3** If the thread is already attached to the mentioned project, no banner MUST be shown.

**FR-3.4** Context injection MUST occur even if the thread is not attached to the project (one-time injection).

**FR-3.5** The system MUST support multiple `@Project` mentions in a single message.

### FR-4: Sidebar Hierarchy

**FR-4.1** The sidebar MUST display a hierarchical structure with projects as top-level items.

**FR-4.2** Each project MUST be expandable/collapsible.

**FR-4.3** Threads belonging to a project MUST appear nested under the project.

**FR-4.4** Free chats MUST appear in a separate "Chats" section.

**FR-4.5** The sidebar MUST display a "+" button for each project to create new threads within that project.

**FR-4.6** The sidebar MUST display a "+" button for the "Chats" section to create new free chats.

### FR-5: Context Visibility

**FR-5.1** The chat header MUST display the active project name if the thread is attached to a project.

**FR-5.2** The chat header MUST display "Free Chat" or no project indicator if the thread is not attached.

**FR-5.3** Users MUST be able to view which project (if any) a thread belongs to at all times.

### FR-6: Memory Scoping

**FR-6.1** Project memory MUST be isolated to the project scope.

**FR-6.2** Thread memory MUST be isolated to the thread scope.

**FR-6.3** Pinned memory MUST be accessible across all threads.

**FR-6.4** Profile and Skill memory MUST be accessible as background context (lower ranking).

**FR-6.5** Memory ranking MUST prioritize project memory when a thread is attached to a project.

---

## 5. Non-Functional Requirements

### NFR-1: Performance

**NFR-1.1** Context computation MUST complete within 200ms for threads with <1000 messages.

**NFR-1.2** Sidebar rendering MUST support 100+ projects without perceptible lag (<50ms).

**NFR-1.3** Memory retrieval MUST use vector similarity search with <100ms latency.

### NFR-2: Scalability

**NFR-2.1** The system MUST support 1000+ projects per user.

**NFR-2.2** The system MUST support 10,000+ threads per user.

**NFR-2.3** The system MUST support 100,000+ memory entries per user.

### NFR-3: Reliability

**NFR-3.1** Project-thread associations MUST be ACID-compliant.

**NFR-3.2** Context injection MUST be deterministic given the same input state.

**NFR-3.3** Memory ranking MUST be consistent across identical queries.

### NFR-4: Usability

**NFR-4.1** Project creation MUST require ≤2 user actions.

**NFR-4.2** Thread attachment MUST require ≤1 user action (click banner).

**NFR-4.3** `@Project` mention autocomplete MUST display within 50ms of typing `@`.

### NFR-5: Data Integrity

**NFR-5.1** Archived projects MUST NOT lose memory data.

**NFR-5.2** Thread reassignment MUST NOT delete thread history.

**NFR-5.3** Project deletion (if implemented) MUST cascade to memory cleanup with user confirmation.

---

## 6. System Constraints

### Technical Constraints

**TC-1** The system MUST run on Convex backend infrastructure.

**TC-2** The system MUST use TypeScript for type safety.

**TC-3** The system MUST use React for frontend rendering.

**TC-4** The system MUST integrate with existing mode selection system (Code, Learn, Think, Create).

**TC-5** The system MUST integrate with existing NLP task classification pipeline.

### Business Constraints

**BC-1** The system MUST be production-ready within 6 weeks.

**BC-2** The system MUST not degrade performance of existing chat functionality.

**BC-3** The system MUST support existing user data migration (retroactive project assignment).

### Regulatory Constraints

**RC-1** The system MUST comply with GDPR data isolation requirements.

**RC-2** The system MUST support user data export (projects, threads, memory).

---

## 7. UX Rules

### UR-1: Sidebar Interaction

**UR-1.1** Clicking a project name MUST expand/collapse the project.

**UR-1.2** Clicking a thread MUST activate that thread in the main chat view.

**UR-1.3** The "+" button next to a project MUST create a new thread within that project.

**UR-1.4** Hovering over a project MUST display quick actions (rename, archive).

### UR-2: Context Attachment

**UR-2.1** The attachment banner MUST appear immediately after AI response.

**UR-2.2** The banner MUST display: "Attach this thread to [ProjectName]?"

**UR-2.3** The banner MUST have "Attach" and "Dismiss" buttons.

**UR-2.4** Clicking "Attach" MUST associate the thread with the project and close the banner.

**UR-2.5** Clicking "Dismiss" MUST close the banner without attachment.

**UR-2.6** Dismissed banners MUST NOT reappear for the same `@Project` mention.

### UR-3: Visual Indicators

**UR-3.1** Active thread MUST be highlighted in the sidebar.

**UR-3.2** Projects with unread threads MUST display a badge with unread count.

**UR-3.3** The chat header MUST display project context prominently.

**UR-3.4** `@Project` mentions in the input MUST be syntax-highlighted.

### UR-4: Drag and Drop (Optional)

**UR-4.1** Users MAY drag a thread from "Chats" into a project to attach it.

**UR-4.2** Users MAY drag a thread from a project to "Chats" to detach it.

---

## 8. Edge Case Handling

### EC-1: Deleted Projects

**Scenario:** User mentions `@ProjectName` where ProjectName has been archived.

**Behavior:** System displays error message "Project 'ProjectName' is archived. Restore to use."

### EC-2: Ambiguous Project Names

**Scenario:** User types `@Pro` where multiple projects match ("Project A", "Programming Guide").

**Behavior:** Autocomplete displays all matches. User must select explicit project.

### EC-3: Thread Already Attached

**Scenario:** User types `@ProjectA` in a thread already attached to ProjectA.

**Behavior:** No banner displayed. Context injection occurs normally.

### EC-4: Thread Attached to Different Project

**Scenario:** User types `@ProjectB` in a thread attached to ProjectA.

**Behavior:** Context injection includes ProjectB memory. Banner displays "Switch thread to ProjectB?" with options: "Switch", "Keep in ProjectA", "Dismiss".

### EC-5: Empty Project

**Scenario:** User creates a project but never creates threads or memory within it.

**Behavior:** Project remains in sidebar. Displays "Empty project" state. Suggests creating first thread.

### EC-6: Concurrent Thread Modification

**Scenario:** User edits thread attachment while AI is generating response with old context.

**Behavior:** Response is stamped with context snapshot at inference time. Displayed to user with warning if context changed.

---

## 9. Definitions

**Context Pollution:** The degradation of memory retrieval accuracy and cognitive clarity caused by unrelated information competing for attention in a flat organizational structure.

**Bounded Context:** A semantic boundary within which specific domain knowledge, terminology, and rules are consistently defined and isolated from other contexts.

**Progressive Disclosure:** An interaction design pattern where complex features are revealed incrementally as users demonstrate need or readiness.

**Memory Scoping:** The algorithmic process of limiting memory retrieval to specific organizational boundaries (e.g., project, thread, user).

**Mention-Based Injection:** An interaction pattern where typing `@Entity` triggers system behavior (e.g., context injection, notification).

**Cognitive Workspace:** A bounded organizational unit that segments attention and memory to reduce cognitive load.

**Hierarchical Organization:** A tree-structured data organization pattern where entities are nested within parent entities (e.g., threads within projects).

---

## 10. Acceptance Criteria

The system is considered specification-compliant when:

1. All functional requirements (FR-1 through FR-6) are implemented and tested.
2. All non-functional requirements (NFR-1 through NFR-5) are measured and verified.
3. All system constraints (TC, BC, RC) are satisfied.
4. All UX rules (UR-1 through UR-4) are implemented and validated with user testing.
5. All edge cases (EC-1 through EC-6) are handled as specified.
6. The system passes integration testing with existing Convex backend, mode selection, and NLP classification systems.
7. The system demonstrates correctness on validation dataset with >95% context injection accuracy.
8. The system is academically defensible under peer review for hierarchical memory architecture claims.

---

## 11. Future Extensions

### Phase 2: Advanced Memory Management

- Cross-project memory retrieval with explicit user permission
- Project templates and cloning
- Automatic memory importance scoring with ML

### Phase 3: Collaboration

- Shared projects with multi-user access
- Project-level permissions
- Collaborative thread editing

### Phase 4: Intelligence

- Automatic project suggestion based on conversation topic
- Smart thread reassignment recommendations
- Project-level analytics and insights

---

## 12. Testing Approach

### 12.1 Backend Testing with convex-test

The system uses the [`convex-test`](https://www.npmjs.com/package/convex-test) library to provide a mock implementation of the Convex backend for fast automated testing of function logic.

#### Setup

Install test dependencies:

```bash
npm install --save-dev convex-test vitest @edge-runtime/vm
```

Add test scripts to `package.json`:

```json
"scripts": {
  "test": "vitest",
  "test:once": "vitest run",
  "test:debug": "vitest --inspect-brk --no-file-parallelism",
  "test:coverage": "vitest run --coverage --coverage.reporter=text"
}
```

Configure Vitest with `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'edge-runtime',
    server: { deps: { inline: ['convex-test'] } },
  },
})
```

For projects with custom Convex folder configuration, use:

```typescript
// convex/test.setup.ts
export const modules = import.meta.glob('./**/*.ts')
```

#### Basic Testing Pattern

```typescript
import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

test('sending messages', async () => {
  const t = convexTest(schema)
  await t.mutation(api.messages.send, { body: 'Hi!', author: 'Sarah' })
  const messages = await t.query(api.messages.list)
  expect(messages).toMatchObject([{ body: 'Hi!', author: 'Sarah' }])
})
```

#### Key Testing Capabilities

**1. Function Testing**: Call any Convex function (query, mutation, action, http action)

```typescript
const t = convexTest(schema)
const result = await t.query(api.posts.list)
await t.mutation(api.posts.create, { title: 'Test' })
await t.action(api.externalAPI.fetch, { url: '...' })
```

**2. Direct Database Operations**: Modify mock database without declaring functions

```typescript
const t = convexTest(schema)
const firstTask = await t.run(async (ctx) => {
  await ctx.db.insert('tasks', { text: 'Task 1' })
  return await ctx.db.query('tasks').first()
})
```

**3. Authentication Testing**: Simulate user identity

```typescript
const t = convexTest(schema)
const asSarah = t.withIdentity({ name: 'Sarah' })
await asSarah.mutation(api.tasks.create, { text: 'Add tests' })
```

**4. HTTP Action Testing**: Test HTTP endpoints

```typescript
const t = convexTest(schema)
const response = await t.fetch('/some/path', { method: 'POST' })
expect(response.status).toBe(200)
```

**5. Scheduled Functions Testing**: Control time with fake timers

```typescript
import { vi } from 'vitest'
vi.useFakeTimers()
const t = convexTest(schema)
await t.mutation(api.scheduler.scheduleTask, { delayMs: 10000 })
vi.advanceTimersByTime(10000)
await t.finishInProgressScheduledFunctions()
vi.useRealTimers()
```

#### Test Coverage

Run coverage analysis:

```bash
npm run test:coverage
```

#### Limitations

The convex-test mock differs from real Convex backend:

- Error message content may vary
- Limits (size, time) are not enforced
- Document/Storage ID format may differ
- Edge Runtime mock differs slightly from Convex runtime
- Text search returns prefix matches without relevance sorting
- Vector search uses cosine similarity without efficient indexing
- Cron jobs are not supported (trigger functions manually)

For testing against a real Convex backend, see [Testing Local Backend](https://docs.convex.dev/testing/convex-backend).

---

## 13. References

- Card, S., Moran, T., & Newell, A. (1983). _The Psychology of Human-Computer Interaction_. Lawrence Erlbaum Associates.
- Tulving, E., & Thomson, D. M. (1973). Encoding specificity and retrieval processes in episodic memory. _Psychological Review_, 80(5), 352-373.
- Miller, G. A. (1956). The magical number seven, plus or minus two: Some limits on our capacity for processing information. _Psychological Review_, 63(2), 81-97.
- Convex Testing Documentation. (2026). convex-test library. Retrieved from https://docs.convex.dev/testing/convex-test

---

**End of Specification**
