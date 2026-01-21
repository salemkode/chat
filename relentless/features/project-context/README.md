# Project-Scoped Context System

**Feature Status:** Design Phase Complete  
**Version:** 1.0  
**Last Updated:** 2026-01-21

---

## Overview

A **Hierarchical Context Management System** that enables users to organize conversations into projects, inject project-specific memory via `@mentions`, and manage bounded cognitive workspaces for improved AI interaction quality.

**Key Innovation:** Uses **Convex Dynamic Agents** (`@convex-dev/agent`) for runtime model selection and multi-model support across GPT-4 and Claude 3 Opus.

---

## Feature Package Contents

### Core Documents

1. **spec.md** (17KB, 549 lines)
   - Academic specification with formal conceptual model
   - Cognitive workspace theory and hierarchical memory architecture
   - Complete functional and non-functional requirements
   - Research-grounded with proper citations

2. **plan.md** (52KB, 1,778 lines)
   - Complete Convex schema design with vector indexes
   - **Dynamic Agent architecture** with factory pattern
   - 5 specialized components (2 Dynamic Agents, 3 Actions)
   - Data flow architecture and performance optimization
   - 4-phase implementation plan (6 weeks)

3. **tasks.md** (28KB, 1,005 lines)
   - 10 epics, 35+ user stories
   - Detailed acceptance criteria per story
   - Dynamic Agent implementation tasks
   - Dependency mapping and risk mitigation

4. **checklist.md** (14KB, 456 lines)
   - 200+ validation items across 13 categories
   - UX correctness, memory correctness, context injection accuracy
   - Performance thresholds, security, demo-readiness

5. **prd.json** (25KB, 627 lines)
   - Machine-readable system specification
   - Complete data models, agent definitions, context rules
   - Dynamic Agent package dependencies
   - Success metrics and acceptance criteria

6. **progress.txt** (13KB, 381 lines)
   - 6 milestones with delivery targets
   - Open questions requiring decisions
   - Known risks with mitigation strategies
   - Feature flag status and rollout plan

---

## Dynamic Agent Architecture

### Multi-Model Support

The system uses **Convex Dynamic Agents** for runtime model selection:

```typescript
import { Agent } from '@convex-dev/agent'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'

// Model Router selects model based on mode/intent
const { languageModel } = selectModel({
  mode: 'think',
  intent: 'question',
  contextTokenCount: 5000,
}) // Returns anthropic("claude-3-opus-20240229")

// Create Dynamic Agent with selected model
const agent = new Agent(components.agent, {
  name: 'InferenceAgent',
  languageModel, // Runtime model injection
  tools: { searchMemories, getThreadContext },
  maxSteps: 3,
})
```

### Agent Components

1. **NLP Classifier** - Action (no LLM)
   - Regex-based `@Project` mention extraction
   - Intent classification

2. **Context Builder** - Action (no LLM)
   - Vector similarity search for memories
   - Ranked context assembly

3. **Model Router** - Factory Function
   - Returns `LanguageModel` instance
   - Mode-based selection (GPT-4/Claude)

4. **Main Inference Agent** - **Dynamic Agent**
   - Uses selected model
   - Tools: `searchMemories`, `getThreadContext`
   - Multi-step reasoning (maxSteps: 3)

5. **Memory Manager Agent** - **Dynamic Agent**
   - LLM-powered fact extraction
   - Tools: `extractFacts`, `generateEmbedding`, `storeMemory`
   - Multi-step workflow (maxSteps: 10)

6. **UX State** - Action (no LLM)
   - Banner display logic

---

## Package Dependencies

```json
{
  "@convex-dev/agent": "^0.x.x",
  "@ai-sdk/openai": "^0.x.x",
  "@ai-sdk/anthropic": "^0.x.x",
  "ai": "^3.x.x"
}
```

---

## Implementation Timeline

**Total Duration:** 6 weeks (2 engineers full-time)

- **Week 1-2:** Data Layer Foundation
- **Week 3-4:** Context Injection System + Dynamic Agents
- **Week 5:** Memory System
- **Week 6:** UX Polish + Testing + Rollout

---

## Success Metrics

- Context injection accuracy: **>95%**
- Memory extraction accuracy: **>80%**
- Context build latency p99: **<200ms**
- Memory retrieval latency p99: **<100ms**
- Attachment banner conversion rate: **>40%**
- Feature adoption: **>30% within 2 weeks**
- User satisfaction (NPS): **>50**

---

## Key Features

### Hierarchical Sidebar

```
▸ Relentless   ➕
  ├ 🧠 Memory System
  ├ 💻 Model Selector
  └ 📄 PRD

▸ Graduation Thesis   ➕
  ├ 📚 Literature Review
  └ 🧪 Experiments

▾ Chats
  💬 write a big story
  💬 How build ai system
```

### @Mention Context Injection

1. User types `@Graduation Thesis` in message
2. System injects project memory into context
3. AI responds with project context
4. Banner prompts: "Attach this thread to Graduation Thesis?"
5. User clicks "Attach" → thread moves to project

### Multi-Model Selection

- **Code mode:** GPT-4 Turbo (temp 0.2, 8k tokens)
- **Learn mode:** GPT-4 Turbo (temp 0.5, 4k tokens)
- **Think mode:** Claude 3 Opus (temp 0.8, 4k tokens)
- **Create mode:** GPT-4 Turbo (temp 0.9, 6k tokens)
- **Long context (>6k tokens):** Auto-switch to Claude

---

## Next Steps

1. **Engineering Review:** Review spec.md and plan.md
2. **Product Approval:** Stakeholder sign-off
3. **Resource Allocation:** Assign 2 engineers for 6 weeks
4. **Week 1 Kickoff:** Begin data layer implementation

---

## Research Foundation

This system is academically grounded in:

- **Cognitive Workspace Theory** (Card, Moran, Newell 1983)
- **Hierarchical Memory Architecture** (Tulving & Thomson 1973)
- **Context-Dependent Retrieval** (Miller 1956)

See `spec.md` Section 3 for detailed research framing.

---

## Contact

**Feature Owner:** [PENDING ASSIGNMENT]  
**Technical Lead:** [PENDING ASSIGNMENT]  
**Spec Author:** Relentless Systems Architecture  
**Date:** 2026-01-21

---

**Status:** ✅ Design Phase Complete - Ready for Implementation
