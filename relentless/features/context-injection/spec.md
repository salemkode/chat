# Feature Specification: Context Injection System

**Feature Branch**: `001-context-injection`
**Created**: 2026-01-23
**Status**: Design Phase
**Input**: Implement intelligent pipeline for assembling and injecting relevant context into AI conversations using NLP classification, vector similarity, and Dynamic Agents
**Routing Preference**: auto: good | allow free: yes

---

## 1. Abstract

This specification defines the **Context Injection System**, an intelligent pipeline for assembling and injecting relevant context into AI conversations. The system uses NLP classification, vector similarity search, and Dynamic Agents to provide contextualized responses.

---

## 2. User Scenarios & Testing _(mandatory)_

### User Story 1 - Automatic Project Context Detection (Priority: P1)

As a user, I want the system to automatically detect when I mention a project in my conversation so that relevant context from that project is automatically retrieved without me having to manually select it.

**Why this priority**: Core value proposition - automatic context detection eliminates manual context management, making the system feel intelligent and effortless.

**Independent Test**: Can be tested by sending a message with "@Graduation Thesis" and verifying the NLP Classifier Agent extracts the project mention and triggers context retrieval for that project.

**Acceptance Scenarios**:

1. **Given** a user types "@Thesis in the message", **When** NLP Classifier processes it, **Then** projectMentions MUST include "Thesis" (fuzzy matched)
2. **Given** a project is mentioned, **When** Context Builder runs, **Then** memories from that project's scope MUST be included in context
3. **Given** no project is mentioned, **When** Context Builder runs, **Then** it MUST use current thread's project if available
4. **Given** multiple projects are mentioned, **When** Context Builder runs, **Then** it MUST include memories from all mentioned projects
5. **Given** a mentioned project doesn't exist, **When** NLP Classifier processes, **Then** it MUST handle gracefully (ignore or show suggestion)

---

### User Story 2 - Context Ranking and Token Management (Priority: P1)

As a user, I want the system to prioritize the most relevant context so that responses are accurate and stay within token limits.

**Why this priority**: Without ranking, context becomes noise. Proper ranking ensures quality responses while managing costs.

**Independent Test**: Can be tested by storing 100 memories with varying relevance/recency/importance, then verifying the top-K selected memories follow the ranking formula and respect token limits.

**Acceptance Scenarios**:

1. **Given** 200 candidate memories exist, **When** Context Builder assembles context, **Then** only top memories fitting token budget MUST be included
2. **Given** memories are ranked, **When** assembled, **Then** ranking MUST use formula: `0.5 * relevance + 0.3 * recency + 0.2 * importance`
3. **Given** assembled context, **When** measured, **Then** total token count MUST NOT exceed 4000 tokens (configurable)
4. **Given** context is assembled, **When** returned, **Then** sources MUST be tracked (memory IDs, project IDs)

---

### User Story 3 - Dynamic Agent Model Selection (Priority: P2)

As a user, I want the system to automatically choose the best AI model for my task so that I get optimal quality/cost tradeoffs without manual configuration.

**Why this priority**: Enhances user experience and optimizes costs. Secondary to context detection but valuable for system efficiency.

**Independent Test**: Can be tested by setting different thread modes (code, learn, think, create) and verifying the Model Router selects appropriate models for each mode.

**Acceptance Scenarios**:

1. **Given** thread mode is "code", **When** Model Router selects, **Then** it MUST choose a model with strong coding capabilities (e.g., Sonnet)
2. **Given** thread mode is "learn", **When** contextTokenCount is low, **Then** it MUST choose a cost-optimized model (e.g., Haiku)
3. **Given** intent is "creative-writing", **When** Model Router selects, **Then** temperature MUST be set to 0.8-1.0
4. **Given** model selection fails, **When** error occurs, **Then** it MUST fallback to default model (Sonnet)
5. **Given** mode and intent, **When** Model Router runs, **Then** selection MUST complete in <10ms

---

### User Story 4 - Thread Attachment Suggestions (Priority: P2)

As a user, I want the system to suggest attaching my free chat to a project when I mention it so that my conversations are automatically organized.

**Why this priority**: UX enhancement that improves organization but isn't critical for core functionality.

**Independent Test**: Can be tested by starting a free chat and mentioning a project, then verifying the attachment banner appears with the correct project suggestion.

**Acceptance Scenarios**:

1. **Given** a free chat thread (projectId=null), **When** user mentions "@Thesis", **Then** attachment banner MUST appear suggesting to attach to "Thesis" project
2. **Given** banner appears, **When** user clicks "Attach", **Then** thread MUST update to have projectId=Thesis
3. **Given** thread is already in a project, **When** user mentions a different project, **Then** banner MUST suggest moving to the mentioned project
4. **Given** user dismisses banner, **When** they mention the project again, **Then** banner MUST NOT reappear in same session
5. **Given** mentioned project doesn't exist, **When** detected, **Then** banner MUST show "Create project" suggestion

---

### Edge Cases

- What happens when NLP classification fails or times out?
- How does system handle ambiguous project mentions (e.g., "Thesis" vs "Senior Thesis")?
- What happens when all memories exceed token budget?
- How does system handle context injection failure (fallback behavior)?
- What happens when model routing configuration is invalid?
- How does system handle concurrent context assembly requests?

---

## 3. Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: NLP Classifier Agent MUST extract @Project mentions from message content with >99% accuracy
- **FR-002**: NLP Classifier Agent MUST classify message intent (coding, learning, thinking, creating) with >90% accuracy
- **FR-003**: NLP classification MUST complete within 50ms per message
- **FR-004**: Context Builder Agent MUST retrieve memories from mentioned projects and current thread
- **FR-005**: Context Builder Agent MUST rank memories using `0.5 * relevance + 0.3 * recency + 0.2 * importance` formula
- **FR-006**: Context Builder Agent MUST respect token budget (default 4000 tokens)
- **FR-007**: Context building MUST complete within 200ms
- **FR-008**: Model Router MUST select appropriate model based on mode, intent, and token count
- **FR-009**: Model Router selection MUST complete within 10ms
- **FR-010**: Inference Agent MUST generate responses using Dynamic Agent pattern
- **FR-011**: UX State Agent MUST determine attachment banner visibility based on project mentions
- **FR-012**: End-to-end pipeline (classification → context → model → inference) MUST complete within 2 seconds

### Key Entities

- **ProjectMention**: Extracted reference to a project with confidence score and position in message
- **ContextAssembly**: Ranked collection of memories with token counts and source tracking
- **ModelSelection**: Chosen model, max tokens, temperature, and reasoning
- **AttachmentBannerState**: showBanner, bannerProjectId, bannerMessage

---

## 4. Test Strategy (MANDATORY)

### Unit Test Approach

- NLP classification accuracy (project mention extraction)
- Intent classification accuracy (coding vs learning vs thinking vs creating)
- Memory ranking formula calculation
- Token budget validation (context assembly stops at limit)
- Model selection logic based on mode and intent
- Attachment banner state logic

### Integration Test Scenarios

- Full context injection pipeline: message → classify → retrieve → rank → inject → infer
- Project mention to context retrieval flow
- Multi-project mention context assembly
- Model routing with fallback scenarios
- Attachment suggestion to thread attachment flow

### Edge Case Tests

- No project mentions (use current thread context)
- Multiple project mentions (aggregate contexts)
- Mentioned project doesn't exist (handle gracefully)
- Token budget exceeded (prioritize ranking)
- NLP classification timeout (fallback to basic heuristics)
- Concurrent message processing (race conditions)

### Test Data Requirements

- Sample messages with various @mention formats (@Project, "Project", etc.)
- Messages with different intents and complexity
- Memory datasets for retrieval testing (various scopes/scores)
- Model routing configurations and fallback scenarios
- Edge case messages (very long, multiple mentions, ambiguous)

---

## 5. Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: @Mention detection achieves >99% accuracy on test dataset
- **SC-002**: Intent classification achieves >90% accuracy on test dataset
- **SC-003**: End-to-end context injection completes within 2 seconds for 95% of requests
- **SC-004**: 85% of users report that AI responses are more contextualized and relevant
- **SC-005**: Attachment suggestions result in 30% increase in project-organized threads
- **SC-006**: System handles 100 concurrent context assembly requests without degradation

---

## 6. System Components

### 6.1 NLP Classifier Agent

Extracts @Project mentions and classifies message intent.

**Input:** `{ userId, threadId, messageContent }`

**Output:** `{ projectMentions: Array<{name, confidence}>, intent: string, entities: Array }`

**Performance:** <50ms per message

### 6.2 Context Builder Agent

Assembles ranked context from multiple sources.

**Input:** `{ threadId, userId, projectMentions, currentProjectId }`

**Output:** `{ context: string, tokenCount: number, sources: Array<{type, id, relevance}> }`

**Performance:** <200ms per assembly

### 6.3 Model Router

Selects optimal AI model based on mode and context.

**Input:** `{ mode: "code"|"learn"|"think"|"create", intent: string, contextTokenCount: number }`

**Output:** `{ languageModel: string, maxTokens: number, temperature: number, reasoning: string }`

**Performance:** <10ms per selection

### 6.4 Inference Agent

Generates AI responses using Dynamic Agent pattern.

**Input:** `{ threadId, content: string, mode: string }`

**Output:** `{ assistantMessage: string, model: string, tokenCount: number }`

### 6.5 UX State Agent

Manages attachment banner state.

**Input:** `{ threadId, projectMentions, currentProjectId }`

**Output:** `{ showBanner: boolean, bannerProjectId: string|null, bannerMessage: string }`

---

**End of Specification**
