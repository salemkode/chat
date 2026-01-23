# Implementation Tasks: Context Injection System

**Version:** 1.0
**Status:** Task Breakdown
**Date:** 2026-01-23

---

## Epic 1: NLP Classification

### Story 1.1: NLP Classifier Agent

**Priority:** P0 (Blocker)
**Estimate:** 3 days

**Description:**
As the system, I need to detect @Project mentions in user messages so that I can inject project context.

**Tasks:**

- [ ] Implement `classifyMessage` action
- [ ] Write regex to extract @mentions
- [ ] Query projects table for validation
- [ ] Implement intent classification
- [ ] Handle edge cases (multiple mentions, archived projects, etc.)
- [ ] Write unit tests (20+ cases)
- [ ] Measure latency (<50ms target)

---

## Epic 2: Context Building

### Story 2.1: Context Builder Agent

**Priority:** P0 (Blocker)
**Estimate:** 4 days

**Description:**
As the system, I need to assemble ranked context from thread history and project memory.

**Tasks:**

- [ ] Implement `buildContext` action
- [ ] Fetch thread history
- [ ] Fetch project memory (attached + mentioned)
- [ ] Fetch pinned memory
- [ ] Implement ranking function
- [ ] Truncate to token limit
- [ ] Write unit tests

---

## Epic 3: Model Selection

### Story 3.1: Model Router Factory

**Priority:** P1 (High)
**Estimate:** 2 days

**Description:**
As the system, I need to select the optimal AI model for Dynamic Agent creation.

**Tasks:**

- [ ] Install AI SDK packages
- [ ] Implement `selectModel` factory function
- [ ] Configure language models
- [ ] Define model selection rules
- [ ] Handle long context adjustment
- [ ] Write unit tests

---

## Epic 4: AI Inference

### Story 4.1: Main Inference Agent

**Priority:** P0 (Blocker)
**Estimate:** 4 days

**Description:**
As the system, I need to create a Dynamic Agent that generates AI responses.

**Tasks:**

- [ ] Implement `createInferenceAgent` factory
- [ ] Define mode-specific instructions
- [ ] Create tools (searchMemories, getThreadContext)
- [ ] Implement `sendMessage` action
- [ ] Store context snapshots
- [ ] Add error handling
- [ ] Write integration tests

---

## Epic 5: UX State

### Story 5.1: UX State Agent

**Priority:** P0 (Blocker)
**Estimate:** 2 days

**Description:**
As the system, I need to determine when to show attachment banners.

**Tasks:**

- [ ] Implement `determineBannerState` action
- [ ] Check thread attachment status
- [ ] Check banner dismissal status
- [ ] Handle multiple mentions
- [ ] Write unit tests

---

## Summary

**Total Epics:** 5
**Total Stories:** 5
**Estimated Duration:** 3 weeks

---
