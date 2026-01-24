# Feature Specification: Memory System

**Feature Branch**: `002-memory-system`
**Created**: 2026-01-23
**Status**: Design Phase
**Input**: Implement intelligent storage, retrieval, and extraction of conversational knowledge using vector embeddings and LLM-powered fact extraction
**Routing Preference**: auto: good | allow free: yes

---

## 1. Abstract

This specification defines the **Memory System**, which provides intelligent storage, retrieval, and extraction of conversational knowledge using vector embeddings and LLM-powered fact extraction.

---

## 2. User Scenarios & Testing _(mandatory)_

### User Story 1 - Store Conversational Facts (Priority: P1)

As a user, I want the system to automatically extract and store important facts from my conversations so that I don't have to repeat information in future conversations.

**Why this priority**: This is the core value proposition - without storage, there's nothing to retrieve. Enables cumulative knowledge building across conversations.

**Independent Test**: Can be tested by sending messages with factual content (e.g., "I prefer Python over JavaScript"), then verifying the fact is stored in Convex with correct embedding and scores.

**Acceptance Scenarios**:

1. **Given** a user sends a message containing factual statements, **When** the message is processed, **Then** each fact MUST be stored as a separate memory with generated embedding
2. **Given** a memory is stored, **When** retrieval is queried, **Then** the memory MUST have all required fields (id, userId, scope, content, embedding, scores)
3. **Given** embedding generation fails, **When** the API error occurs, **Then** the system MUST retry up to 3 times with exponential backoff
4. **Given** a memory is created, **When** stored, **Then** it MUST have initial relevanceScore=0.5, recencyScore=1.0, importanceScore=0.5

---

### User Story 2 - Retrieve Relevant Context (Priority: P1)

As a user, I want the system to automatically retrieve relevant past memories when I'm having a conversation so that I get contextualized responses without repeating myself.

**Why this priority**: Without retrieval, stored memories are useless. This delivers the primary user value of context-aware conversations.

**Independent Test**: Can be tested by storing specific memories, then querying with a related message and verifying top-K results include the stored memories ranked by the formula.

**Acceptance Scenarios**:

1. **Given** 100 memories exist across various scopes, **When** a query is performed, **Then** results MUST be ranked by `0.5 * relevance + 0.3 * recency + 0.2 * importance`
2. **Given** a query is performed, **When** vector search executes, **Then** results MUST be returned within 100ms for databases with 10k memories
3. **Given** memories at different scopes, **When** retrieving for a specific project, **Then** ONLY project + thread + pinned scoped memories MUST be considered
4. **Given** no relevant memories exist, **When** a query is performed, **Then** empty array MUST be returned (not null or undefined)

---

### User Story 3 - Extract Facts from AI Responses (Priority: P2)

As a user, I want the system to learn from the AI's responses too, so that knowledge flows both directions and creates a richer memory store.

**Why this priority**: Enhances memory coverage but is secondary to user-stated facts. AI responses contain valuable inferred knowledge.

**Independent Test**: Can be tested by having an AI response with factual claims, then verifying those facts are extracted and stored with appropriate attribution.

**Acceptance Scenarios**:

1. **Given** an AI response contains factual statements, **When** extraction runs, **Then** only objective facts MUST be extracted (not opinions or greetings)
2. **Given** extraction is running, **When** processing a typical response, **Then** extraction MUST complete within 5 seconds
3. **Given** extracted facts, **When** stored, **Then** they MUST be tagged with `metadata.source = "ai_response"`

---

### User Story 4 - Pin Important Memories (Priority: P3)

As a user, I want to manually pin critical memories so that they are always prioritized in retrieval regardless of recency.

**Why this priority**: Quality-of-life enhancement. Important but not essential for MVP functionality.

**Independent Test**: Can be tested by pinning a memory, then performing queries and verifying pinned memories appear in top results.

**Acceptance Scenarios**:

1. **Given** a memory exists, **When** user pins it, **Then** scope MUST update to "pinned" and importanceScore MUST set to 1.0
2. **Given** a pinned memory, **When** retrieved, **Then** it MUST rank higher than non-pinned memories with equal relevance
3. **Given** a memory is unpinned, **When** scope changes, **Then** it MUST revert to previous scope with original importanceScore

---

### Edge Cases

- What happens when embedding API rate limits are exceeded?
- How does system handle memories with identical content (deduplication)?
- What happens when a user has 100k+ memories (query performance)?
- How does system handle non-English text in embeddings?
- What happens when memory content exceeds embedding model's token limit?
- How does system handle deleted projects/threads (orphaned memories)?

---

## 3. Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST extract factual statements from conversation messages using LLM
- **FR-002**: System MUST generate 1536-dimensional embeddings using OpenAI `text-embedding-3-small`
- **FR-003**: System MUST store memories with fields: id, userId, scope, scopeId, content, embedding, relevanceScore, recencyScore, importanceScore, timestamps, metadata
- **FR-004**: System MUST rank memories using formula: `rank = 0.5 * relevance + 0.3 * recency + 0.2 * importance`
- **FR-005**: System MUST support memory scopes: "profile", "skill", "project", "thread", "pinned"
- **FR-006**: System MUST retrieve top-K memories via vector similarity search within 100ms for 10k memories
- **FR-007**: System MUST handle embedding API failures with 3 retries and exponential backoff
- **FR-008**: System MUST update recency scores based on memory age (exponential decay)
- **FR-009**: System MUST allow users to pin/unpin memories with scope="pinned" and importanceScore=1.0
- **FR-010**: System MUST deduplicate memories with identical content within same scope

### Key Entities

- **Memory**: Knowledge artifact with content, embedding, scores, and scope
- **MemoryMetadata**: Additional data including source, extraction timestamp, confidence score
- **EmbeddingVector**: 1536-dimensional array of floats representing semantic meaning

---

## 4. Test Strategy (MANDATORY)

### Unit Test Approach

- Memory ranking formula calculation with various score combinations
- Embedding validation (1536 dimensions, finite values)
- Scope validation logic (valid scopes, required scopeId)
- Score calculation functions (relevance, recency, importance)
- Deduplication logic for identical content

### Integration Test Scenarios

- Full extraction pipeline: message → LLM → parse → embed → store
- Full retrieval pipeline: query → vector search → rank → return
- Pin/unpin flow: update → re-retrieve → verify ranking
- Cross-scope retrieval: verify only appropriate scopes are queried
- Embedding API failure and retry flow

### Edge Case Tests

- Empty message content (no facts to extract)
- Very long messages exceeding token limits
- Identical messages sent multiple times (deduplication)
- Non-English text and special characters
- Maximum database size (10k+ memories) performance
- Concurrent memory writes (race conditions)

### Test Data Requirements

- Sample messages with factual statements (various domains)
- Sample AI responses with mixed facts/opinions
- Edge case strings (unicode, very long, special chars)
- Mock embedding vectors for deterministic testing
- Large dataset for performance testing (10k+ memories)

---

## 5. Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 95% of factual statements are successfully extracted and stored
- **SC-002**: Memory retrieval completes in <100ms for databases with 10k memories
- **SC-003**: 90% of users report reduced need to repeat information across conversations
- **SC-004**: System handles 100k+ memories without performance degradation
- **SC-005**: Embedding API failures cause <1% of memory storage operations to fail
- **SC-006**: Pinned memories consistently appear in top 5 results for relevant queries

---

## 6. Technical Constraints

### TC-1: Embedding Model

- MUST use OpenAI `text-embedding-3-small` (1536 dimensions)
- API rate limit: [NEEDS CLARIFICATION: specific rate limit based on OpenAI tier]

### TC-2: Vector Database

- MUST use Convex vector indexes
- Index dimensions: 1536

### TC-3: LLM for Extraction

- MUST use model specified in routing configuration
- Extraction timeout: 5 seconds per turn

---

**End of Specification**
