# AI Agent Memory System Rules

## Overview

This memory system enables AI agents to store, index, and retrieve information across sessions and interactions. It uses vector embeddings and hybrid search to provide semantic and keyword-based retrieval.

## Core Principles

### 1. Memory Storage Guidelines

**What to Store:**

- Project-specific knowledge, decisions, and conventions
- User preferences, requirements, and constraints
- Domain-specific information and terminology
- Architectural decisions and design patterns
- Common solutions and reusable patterns
- Important conversation context that may be needed later

**What NOT to Store:**

- Temporary debugging information
- Transient session state
- Large code blocks (use file references instead)
- API keys, passwords, or sensitive data
- Real-time or rapidly changing data

### 2. Memory File Organization

Memory files should be organized in the agent workspace:

```
workspace/
├── MEMORY.md          # Primary memory file (high-level overview)
└── memory/            # Detailed memory directory
    ├── project-info.md
    ├── conventions.md
    ├── decisions.md
    └── domain-knowledge.md
```

**File Naming:**

- Use lowercase with hyphens: `project-info.md`
- Keep names descriptive but concise
- Group related information logically

**Content Format:**

- Use Markdown for all memory files
- Structure with clear headings and subheadings
- Use code blocks for examples
- Include metadata sections when relevant

### 3. Memory Entry Structure

Each memory entry should include:

```markdown
## [Topic/Title]

**Context:** [When/why this information matters]
**Relevance:** [What scenarios this applies to]

[Content with clear, concise explanations]

### Examples

[Practical examples if helpful]

**Last Updated:** [Date]
```

### 4. Information Storage Rules

**Rule 1: Atomicity**

- Store one concept per memory entry
- Combine related concepts in the same file, but separate clearly
- Avoid mixing unrelated topics

**Rule 2: Clarity**

- Write for future agents, not just current session
- Assume no prior context
- Include examples for complex concepts

**Rule 3: Maintenance**

- Update entries when information changes
- Mark outdated entries rather than deleting (add `[DEPRECATED]` prefix)
- Cross-reference related entries

**Rule 4: Retrieval-Friendly**

- Use natural language that matches likely queries
- Include alternative terms and synonyms
- Add context markers (e.g., "for API development", "related to authentication")

## Memory Access Patterns

### For AI Agents (Information Storage)

**When to Store:**

1. **After Important Decisions:** Document architectural or technical decisions
2. **Learning New Patterns:** Store patterns that may be reused
3. **User Requirements:** Capture explicit requirements and preferences
4. **Problem Solutions:** Store solutions to complex problems encountered
5. **Domain Expertise:** Save domain-specific knowledge gained during interactions

**Storage Process:**

1. Identify important information to preserve
2. Determine appropriate location (MEMORY.md vs. memory/\*.md)
3. Write clear, self-contained entry
4. Include context and examples
5. Trigger memory sync if automatic sync is not enabled

**Example Storage:**

```markdown
## Authentication Flow

**Context:** API authentication requirements
**Relevance:** All API endpoint development

The project uses JWT tokens for authentication:

1. Client sends credentials to /auth/login
2. Server returns JWT token in response
3. Client includes token in Authorization header
4. Token format: `Bearer <token>`
5. Tokens expire after 24 hours

**Last Updated:** 2026-01-26
```

### For AI Agents (Information Retrieval)

**When to Search:**

1. **Before Making Decisions:** Check for existing decisions or patterns
2. **User Questions:** Search memory before answering domain questions
3. **Implementation Tasks:** Look for conventions and best practices
4. **Problem Solving:** Search for similar problems and solutions

**Search Strategy:**

1. Formulate multiple query variations
2. Use both specific terms and general concepts
3. Review top results even if scores are moderate
4. Cross-reference with context if uncertain
5. Fall back to asking user if no relevant results

**Query Examples:**

- "authentication flow"
- "API token handling"
- "how to authenticate requests"
- "login process"

## Memory System Integration

### Configuration Requirements

Each agent should have memory search configured:

```typescript
{
  memorySearch: {
    provider: "openai" | "gemini" | "local" | "auto",
    model: "text-embedding-3-small",
    sources: ["memory", "sessions"],
    chunking: {
      tokens: 200,
      overlap: 50
    },
    query: {
      maxResults: 10,
      minScore: 0.5,
      hybrid: {
        enabled: true,
        vectorWeight: 0.7,
        textWeight: 0.3
      }
    },
    sync: {
      onSessionStart: true,
      onSearch: true,
      watch: true,
      watchDebounceMs: 5000,
      intervalMinutes: 5,
      sessions: {
        deltaBytes: 1024,
        deltaMessages: 5
      }
    }
  }
}
```

### API Usage

**Getting the Memory Manager:**

```typescript
import { getMemorySearchManager } from './memory/index.js'

const result = await getMemorySearchManager({
  cfg: config,
  agentId: 'your-agent-id',
})

if (result.manager) {
  // Memory search is available
} else {
  // Handle error or proceed without memory
}
```

**Searching Memory:**

```typescript
const results = await manager.search('authentication flow', {
  maxResults: 10,
  minScore: 0.5,
  sessionKey: currentSessionId,
})

results.forEach((r) => {
  console.log(`Score: ${r.score}`)
  console.log(`Path: ${r.path}`)
  console.log(`Lines: ${r.startLine}-${r.endLine}`)
  console.log(`Snippet: ${r.snippet}`)
  console.log(`Source: ${r.source}`)
})
```

**Reading Full Content:**

```typescript
const { text, path } = await manager.readFile({
  relPath: 'memory/authentication.md',
  from: 1,
  lines: 50,
})
```

**Syncing Memory:**

```typescript
// Manual sync
await manager.sync({
  reason: 'manual',
  progress: (update) => {
    console.log(`${update.completed}/${update.total}: ${update.label}`)
  },
})
```

**Checking Status:**

```typescript
const status = manager.status()
console.log(`Files: ${status.files}`)
console.log(`Chunks: ${status.chunks}`)
console.log(`Provider: ${status.provider}`)
console.log(`Model: ${status.model}`)
console.log(`Vector available: ${status.vector?.available}`)
console.log(`FTS available: ${status.fts?.available}`)
```

## Best Practices

### 1. Progressive Documentation

- Start with high-level information in MEMORY.md
- Add detail files in memory/ as needed
- Refactor when organization becomes unclear

### 2. Context Preservation

- Always include context: why, when, for whom
- Link related concepts explicitly
- Update entries when context changes

### 3. Query Optimization

- Use terms that future agents might use
- Include common variations and synonyms
- Structure content to match likely queries

### 4. Quality Over Quantity

- Store meaningful, actionable information
- Avoid duplication
- Remove or deprecate outdated entries

### 5. Session Continuity

- Enable session indexing for multi-session continuity
- Use session keys for warm-starting searches
- Configure sync triggers appropriately

## Common Pitfalls

### Avoid These Mistakes:

1. **Vague Entries:** "Important thing to remember" → Instead: "Project uses PostgreSQL for data persistence"

2. **Over-Indexing:** Don't store every conversation detail. Store only what's reusable.

3. **Poor Organization:** Don't put everything in one file. Use logical structure.

4. **Missing Context:** Don't write "use X library." Include why and when.

5. **Stale Information:** Don't leave outdated entries. Update or deprecate them.

## Troubleshooting

### Memory Search Returns Poor Results

**Possible Causes:**

- Query terms don't match memory content
- Memory entries lack context
- MinScore threshold too high
- New entries not yet indexed

**Solutions:**

- Try multiple query variations
- Lower minScore threshold
- Trigger manual sync
- Review and improve memory entry quality

### Sync Failures

**Possible Causes:**

- Embedding provider unavailable
- API rate limits
- Network issues
- Missing API keys

**Solutions:**

- Check provider availability with `probeEmbeddingAvailability()`
- Verify API keys are configured
- Check network connectivity
- Review error logs for specifics

### Performance Issues

**Possible Causes:**

- Too many memory files
- Large chunk sizes
- Frequent syncs
- Inefficient queries

**Solutions:**

- Reduce file count or merge related files
- Adjust chunking parameters
- Optimize sync intervals
- Use source filters in queries

## Memory as Knowledge Transfer

The memory system serves as a persistent knowledge base that enables:

1. **Cross-Session Continuity:** Agents maintain awareness across sessions
2. **Team Collaboration:** Multiple agents share knowledge
3. **Learning Accumulation:** Solutions and patterns compound over time
4. **Context Recovery:** Quickly regain context after breaks
5. **Knowledge Distribution:** Share expertise across different interactions

When working as an AI agent, treat memory as your long-term knowledge storage that persists beyond individual conversations, enabling you to provide better, more informed responses over time.
