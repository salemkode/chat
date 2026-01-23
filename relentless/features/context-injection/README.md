# Context Injection System

**Status:** 🚧 Not Started
**Priority:** P0 (Blocker)
**Estimated Duration:** 3 weeks

---

## Overview

Context Injection System provides intelligent context assembly for AI conversations. It detects @Project mentions, retrieves relevant memories, selects optimal models, and generates contextualized responses using Dynamic Agents.

---

## Key Features

- **NLP Classifier:** Extract @Project mentions and classify message intent
- **Context Builder:** Assemble ranked context from thread history and project memory
- **Model Router:** Select optimal AI model based on mode, intent, and context length
- **Inference Agent:** Generate AI responses with project-specific context and tools
- **UX State Agent:** Manage attachment banner state and UI interactions

---

## Dependencies

**Required:**

- `project-core` feature (data structures, CRUD APIs)
- `@convex-dev/agent` package installed
- `@ai-sdk/openai` and `@ai-sdk/anthropic` packages installed

**Blocking:**

- `memory-system` feature (context builder depends on memory retrieval)
- `project-ui` feature (UI components depend on context injection APIs)

---

## Progress

- [ ] NLP Classifier Agent
- [ ] Context Builder Agent
- [ ] Model Router Factory
- [ ] Main Inference Agent
- [ ] UX State Agent

See [progress.txt](./progress.txt) for detailed status.

---

## Related Features

- **project-core:** Data structures, CRUD APIs
- **memory-system:** Memory storage, embeddings, retrieval
- **project-ui:** Sidebar, chat view, @mention autocomplete
- **project-enablers:** Testing, documentation, feature flags

---

## Documentation

- [Spec](./spec.md) - Functional and non-functional requirements
- [Tasks](./tasks.md) - Implementation task breakdown
- [Plan](./plan.md) - Technical implementation plan
- [Checklist](./checklist.md) - Quality validation checklist

---

## Branch Convention

Feature branches should follow: `ralph/context-injection-{story-name}`

Example: `ralph/context-injection-nlp-classifier`

---

## Architecture

```
User Input
    ↓
NLP Classifier Agent (Extract @mentions, classify intent)
    ↓
Context Builder Agent (Assemble ranked context)
    ↓
Model Router (Select optimal model)
    ↓
Inference Agent (Generate AI response)
    ↓
UX State Agent (Determine banner state)
```

---

## Contact

For questions or blockers related to this feature, please create an issue or contact the development team.
