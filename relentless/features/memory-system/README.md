# Memory System

**Status:** 🚧 Not Started
**Priority:** P0 (Blocker)
**Estimated Duration:** 2.5 weeks

---

## Overview

Memory System provides intelligent storage, retrieval, and extraction of conversational knowledge using vector embeddings and LLM-powered fact extraction.

---

## Key Features

- **Memory Storage:** Store memories with vector embeddings
- **Embedding Generation:** Generate embeddings using OpenAI API
- **Vector Search:** Retrieve memories by semantic similarity
- **Ranking Algorithm:** Rank memories by relevance, recency, and importance
- **Memory Manager Agent:** LLM-powered automatic fact extraction from conversations

---

## Dependencies

**Required:**

- `project-core` feature (memories table schema)
- OpenAI API access for embeddings
- `@convex-dev/agent` package

**Blocking:**

- `context-injection` feature (depends on memory retrieval API)

---

## Progress

- [ ] Memory Storage API
- [ ] Memory Embedding Generation
- [ ] Memory Retrieval and Ranking
- [ ] Memory Manager Agent

See [progress.txt](./progress.txt) for detailed status.

---

## Related Features

- **project-core:** Data structures
- **context-injection:** Context builder uses memory retrieval
- **project-ui:** Memory display UI (future)

---

## Branch Convention

Feature branches should follow: `ralph/memory-system-{story-name}`

Example: `ralph/memory-system-storage-api`

---
