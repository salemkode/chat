# Quality & Research Validation Checklist

**Feature:** Project-Scoped Context System  
**Version:** 1.0  
**Date:** 2026-01-21

---

## Purpose

This checklist ensures the system meets academic rigor, production quality, and user experience standards. Use this before each release milestone and final deployment.

---

## 1. UX Correctness

### 1.1 Project Management

- [ ] Users can create projects with valid names (max 50 chars, no special chars)
- [ ] Duplicate project names are rejected with clear error message
- [ ] Project rename updates reflected in sidebar within 100ms (real-time)
- [ ] Archived projects disappear from sidebar but remain in database
- [ ] Archived projects cannot be mentioned via @autocomplete
- [ ] Project creation requires ≤2 user actions (click + type name)

### 1.2 Thread Management

- [ ] Users can create threads within projects via "+" button
- [ ] Newly created threads appear in correct project section immediately
- [ ] Free chats appear in separate "Chats" section
- [x] Thread attachment moves thread from "Chats" to project section
- [x] Thread detachment moves thread from project to "Chats" section
- [ ] Thread deletion requires confirmation dialog

### 1.3 Sidebar Interaction

- [ ] Clicking project name expands/collapses thread list
- [ ] Collapse state persists across sessions (localStorage)
- [ ] Clicking thread activates it in main chat view
- [ ] Active thread is highlighted in sidebar
- [ ] Sidebar supports 100+ projects without visible lag (<50ms render)
- [ ] Unread thread counts displayed per project (if implemented)

### 1.4 @Mention Autocomplete

- [ ] Typing `@` triggers autocomplete within 50ms
- [ ] Autocomplete shows projects matching partial query
- [ ] Fuzzy matching works (e.g., "Grad" matches "Graduation Thesis")
- [ ] Keyboard navigation (up/down arrows, Enter) works correctly
- [ ] Selecting project inserts `@ProjectName ` with space
- [ ] Archived projects excluded from autocomplete
- [ ] No matching projects shows "No projects found" message

### 1.5 Attachment Banner

- [ ] Banner appears after AI response to @mention
- [ ] Banner does NOT appear if thread already attached to mentioned project
- [ ] Banner does NOT appear if user previously dismissed it for this mention
- [ ] Banner shows two buttons: "Attach" and "Dismiss"
- [ ] "Attach" button attaches thread and closes banner
- [ ] "Dismiss" button closes banner without attachment
- [ ] Banner message is clear: "Attach this thread to [ProjectName]?"
- [ ] Multiple @mentions show banner for first unattached project

### 1.6 Chat Header

- [ ] Chat header shows project name when thread attached to project
- [ ] Chat header shows "Free Chat" when thread not attached
- [ ] Project name in header is visually distinct (color/icon)
- [ ] Clicking project name in header scrolls to project in sidebar (optional)

---

## 2. Memory Correctness

### 2.1 Memory Extraction

- [ ] Memories are automatically extracted from conversations
- [ ] Extracted memories are factual and relevant (manual review of 100 samples)
- [ ] Extraction accuracy >80% (precision and recall)
- [ ] Extraction does NOT store PII (emails, phone numbers, API keys)
- [ ] Extraction completes within 5s per conversation turn
- [ ] Extraction failures do not block message send

### 2.2 Memory Storage

- [ ] Memories stored with correct scope (profile/skill/project/thread/pinned)
- [ ] `scopeId` matches `projectId` for project-scoped memories
- [ ] Embeddings have correct dimensions (1536 for text-embedding-3-small)
- [ ] `createdAt` and `updatedAt` timestamps are accurate
- [ ] Importance scores initialized to 0.5 (default)
- [ ] Recency scores initialized to 1.0

### 2.3 Memory Retrieval

- [ ] Vector search returns semantically relevant memories
- [ ] Retrieval filters by `userId` (data isolation)
- [ ] Retrieval filters by `scope` and `scopeId` correctly
- [ ] Retrieval latency <100ms for 10k memories
- [ ] Top K memories returned (K=10 by default)
- [ ] No memories leaked across users (security test)

### 2.4 Memory Ranking

- [ ] Ranking formula: `0.5 * relevance + 0.3 * recency + 0.2 * importance`
- [ ] Recency calculated as `exp(-ageInDays / 30)`
- [ ] Project memories ranked higher than profile memories (same query)
- [ ] Ranking is deterministic (same query → same order)
- [ ] Manual review confirms top-ranked memories are most relevant (20 samples)

---

## 3. Context Injection Accuracy

### 3.1 NLP Classifier

- [ ] @Mention regex detects single mentions correctly
- [ ] @Mention regex detects multiple mentions correctly
- [ ] Invalid project names return empty array (no crash)
- [ ] Archived project mentions flagged as error
- [ ] Intent classification accuracy >90% (manual validation on 100 messages)
- [ ] Latency <50ms for messages up to 1000 chars

### 3.2 Context Builder

- [ ] Thread history included in context (last 20 messages)
- [ ] Project memory included when thread attached to project
- [ ] Project memory included when @mentioned (even if not attached)
- [ ] Pinned memory included in all contexts
- [ ] Profile/skill memory included as background (lower rank)
- [ ] Context truncated to 8000 tokens (no overflow)
- [ ] Context build latency <200ms for threads with 1000 messages

### 3.3 Context Snapshot

- [ ] `contextSnapshot` stored in message metadata
- [ ] Snapshot includes active `projectId` at inference time
- [ ] Snapshot allows debugging context issues
- [ ] UI displays context indicator badge (optional)

### 3.4 Model Router

- [ ] Code mode selects GPT-4 Turbo (temp 0.2)
- [ ] Learn mode selects GPT-4 Turbo (temp 0.5)
- [ ] Think mode selects Claude 3 Opus (temp 0.8)
- [ ] Create mode selects GPT-4 Turbo (temp 0.9)
- [ ] Long context (>6000 tokens) triggers Claude selection
- [ ] Model selection is deterministic

---

## 4. Academic Validity

### 4.1 Conceptual Model

- [ ] Projects satisfy definition of "bounded context container"
- [ ] Threads satisfy definition of "sequential conversation history"
- [ ] Memory satisfies definition of "typed knowledge artifact"
- [ ] Context satisfies definition of "computed information environment"
- [ ] System boundaries clearly defined and enforced

### 4.2 Research Framing

- [ ] Cognitive workspace theory correctly applied
- [ ] Hierarchical memory architecture matches literature
- [ ] Memory ranking algorithm grounded in information retrieval research
- [ ] Human-AI interaction rationale defensible under peer review
- [ ] Citations accurate and relevant (Card et al., Tulving & Thomson, Miller)

### 4.3 Formal Definitions

- [ ] All entities have formal mathematical definitions
- [ ] Context computation formula is precise and implementable
- [ ] Memory ranking function is mathematically sound
- [ ] All notation is consistent across documents

### 4.4 Reproducibility

- [ ] Algorithm pseudocode matches implementation
- [ ] Parameters (α, β, γ) documented and justified
- [ ] Test data and results documented for replication
- [ ] System achieves claimed performance metrics

---

## 5. System Reliability

### 5.1 Data Integrity

- [x] Project-thread associations are ACID-compliant
- [x] Concurrent thread attachment/detachment handled correctly
- [ ] Archived projects retain all memory and thread associations
- [ ] No data loss during migration (chats → threads)
- [ ] Rollback script tested and validated

### 5.2 Error Handling

- [ ] User errors show friendly messages (no stack traces)
- [ ] System errors logged to monitoring
- [ ] Context build failures fallback to thread-only context
- [ ] LLM API failures do not crash message send
- [ ] Memory extraction failures logged but do not block user

### 5.3 Edge Cases

- [ ] Archived project mention handled correctly (error message)
- [ ] Ambiguous project names handled (autocomplete shows all matches)
- [ ] Thread already attached handled (no banner)
- [ ] Thread attached to different project handled (switch banner)
- [ ] Empty project handled (shows "Empty project" state)
- [ ] Concurrent thread modification handled (context snapshot)

### 5.4 Transactional Consistency

- [x] Thread attachment is atomic (no partial updates)
- [ ] Project creation + first thread creation is atomic
- [ ] Memory creation + embedding generation is atomic
- [ ] Database constraints enforce referential integrity

---

## 6. Performance Thresholds

### 6.1 Backend Performance

- [ ] Context build latency p50 <100ms
- [ ] Context build latency p99 <200ms
- [ ] Memory retrieval latency p50 <50ms
- [ ] Memory retrieval latency p99 <100ms
- [ ] NLP classification latency <50ms
- [ ] Model selection latency <10ms

### 6.2 Frontend Performance

- [ ] Sidebar render time <50ms for 100 projects
- [ ] Sidebar render time <100ms for 500 projects
- [ ] @Mention autocomplete appears within 50ms
- [ ] Thread activation (click → view) <100ms
- [ ] Attachment banner animation smooth (60fps)

### 6.3 Scalability

- [ ] System supports 1000+ projects per user
- [ ] System supports 10,000+ threads per user
- [ ] System supports 100,000+ memories per user
- [ ] Vector search scales linearly with pre-filtering

### 6.4 Load Testing

- [ ] Load test with 10k concurrent users passes
- [ ] Database connection pool does not saturate
- [ ] No memory leaks in frontend (24-hour soak test)
- [ ] No memory leaks in backend (1-week soak test)

---

## 7. Security & Data Isolation

### 7.1 Authentication & Authorization

- [ ] All queries filter by authenticated `userId`
- [ ] Users cannot access other users' projects
- [ ] Users cannot access other users' threads
- [ ] Users cannot access other users' memories
- [ ] Unauthorized access attempts logged

### 7.2 Data Privacy

- [ ] PII is redacted before storing in memories
- [ ] Embeddings do not leak sensitive information
- [ ] User data export includes all projects/threads/memories (GDPR)
- [ ] User data deletion cascades correctly (GDPR)

### 7.3 Input Validation

- [ ] Project name sanitized (no XSS)
- [ ] Thread title sanitized (no XSS)
- [ ] Message content sanitized (no XSS)
- [ ] SQL injection prevented (Convex handles this)
- [ ] Max length enforced (project name 50 chars, message 10k chars)

---

## 8. Demo-Readiness

### 8.1 User Flows

- [ ] Demo 1: Create project → Create thread → Send message with context
- [ ] Demo 2: Send @mention → See banner → Attach thread
- [ ] Demo 3: Compare AI response with vs. without project context
- [ ] Demo 4: Show sidebar hierarchy with 10+ projects
- [ ] Demo 5: Show memory extraction and retrieval in action

### 8.2 Visual Polish

- [ ] All UI components match design system
- [ ] No placeholder text or "TODO" in UI
- [ ] Icons and colors consistent across app
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] Animations are smooth and purposeful (not distracting)

### 8.3 Documentation

- [ ] User guide published and accessible
- [ ] Video walkthrough created (2-3 minutes)
- [ ] In-app tooltips guide new users
- [ ] FAQ covers common questions
- [ ] Developer documentation complete

---

## 9. Regression Testing

### 9.1 Existing Functionality

- [ ] Existing chat functionality unaffected
- [ ] Mode selection (Code/Learn/Think/Create) still works
- [ ] Model selection still works
- [ ] Message send/receive still works
- [ ] User settings still work

### 9.2 Migration Validation

- [ ] All existing chats migrated to threads
- [ ] No messages lost during migration
- [ ] Message counts match pre/post migration
- [ ] Thread timestamps accurate

---

## 10. Monitoring & Alerts

### 10.1 Metrics Dashboard

- [ ] Dashboard shows real-time metrics:
  - [ ] Context build latency (p50, p99)
  - [ ] Memory retrieval latency (p50, p99)
  - [ ] Attachment banner conversion rate
  - [ ] Project creation rate
  - [ ] Thread creation rate
  - [ ] Memory extraction success rate

### 10.2 Alerts

- [ ] Alert: Context build failures >1%
- [ ] Alert: Memory retrieval timeouts >0.1%
- [ ] Alert: Sidebar render time >100ms
- [ ] Alert: Message send failures >0.5%
- [ ] Alert: LLM API errors >5%

### 10.3 Logging

- [ ] All errors logged with stack traces
- [ ] All user actions logged (audit trail)
- [ ] Performance metrics logged per request
- [ ] Logs queryable and searchable

---

## 11. Rollout Validation

### 11.1 Feature Flags

- [ ] `enable_projects` flag works correctly
- [ ] `enable_context_injection` flag works correctly
- [ ] `enable_memory_extraction` flag works correctly
- [ ] `enable_attachment_banners` flag works correctly
- [ ] Flags can be toggled without deployment

### 11.2 Gradual Rollout

- [ ] Internal users (week 1-2) complete without major issues
- [ ] 10% rollout (week 3-4) complete without major issues
- [ ] 50% rollout (week 5) complete without major issues
- [ ] 100% rollout (week 6) complete without major issues
- [ ] No rollback required at any stage

### 11.3 User Feedback

- [ ] Collect feedback from 50+ users
- [ ] Net Promoter Score (NPS) >50
- [ ] No critical bugs reported
- [ ] Feature adoption rate >30% within 2 weeks

---

## 12. Documentation Completeness

### 12.1 User Documentation

- [ ] User guide complete and accurate
- [ ] Video tutorial published
- [ ] In-app help accessible
- [ ] FAQ updated

### 12.2 Developer Documentation

- [ ] Agent architecture documented
- [ ] Convex schema documented
- [ ] API reference generated
- [ ] Code comments complete (JSDoc)

### 12.3 Research Documentation

- [ ] spec.md complete and peer-reviewed
- [ ] plan.md complete and technically sound
- [ ] tasks.md complete with all stories
- [ ] prd.json valid and machine-readable
- [ ] progress.txt up-to-date

---

## 13. Final Sign-Off

### 13.1 Engineering Sign-Off

- [ ] All unit tests pass (>80% coverage)
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Performance tests meet thresholds
- [ ] Security review complete

### 13.2 Product Sign-Off

- [ ] UX review complete
- [ ] Demo approved by stakeholders
- [ ] User documentation reviewed
- [ ] Rollout plan approved

### 13.3 Research Sign-Off

- [ ] Academic validity confirmed
- [ ] Conceptual model defensible
- [ ] Research framing sound
- [ ] Citations accurate

---

## Checklist Summary

**Total Items:** 200+  
**Critical Path:** Items in sections 1-7 must pass before rollout  
**Post-Launch:** Items in sections 10-11 must pass during rollout  
**Documentation:** Items in section 12 must complete before final release

**How to Use:**

1. Run through checklist at end of each Epic (Epic 1-10 in tasks.md)
2. Mark items as complete only when verified by tests or manual review
3. Document failures in `progress.txt` with remediation plan
4. Do NOT proceed to next Epic until all critical items pass
5. Final sign-off requires all sections 1-13 complete

---

**End of Checklist**
