# AI Agent Memory System Rules

## Overview

The memory system is built on Convex with vector search using text-embedding-3-small (1536 dimensions). It provides semantic search for storing and retrieving information across sessions.

## Core Principles

### What to Store

**Store information that:**

- Project-specific knowledge, decisions, and conventions
- Domain-specific terminology and concepts
- Common solutions and reusable patterns
- Important configuration and setup
- Context for future AI interactions

**What NOT to Store:**

- Temporary debugging information
- Transient conversation details
- Large code blocks (use file references instead)
- API keys or secrets
- User-PII or sensitive data
- Real-time or ephemeral state changes

### Memory File Organization

```
workspace/
├── MEMORY.md          # Primary overview and quick reference
└── memory/            # Detailed knowledge files
    ├── project-info.md       # Project setup and goals
    ├── conventions.md    # Coding standards and patterns
    ├── decisions.md       # Technical decisions
    └── api-docs.md      # API documentation
```

### Entry Format

````markdown
## [Title]

**Context:** When/where to use this information

**Relevance:** [target audience/use case]

**Content:**

- Clear, self-contained documentation
- Examples where helpful
- Key points and best practices
- Code snippets with proper formatting

**Structure:**

- Use headers (##, ###)
- Use bullet points and numbered lists
- Include code blocks with syntax highlighting
- Provide examples

**Last Updated:** [Date]

## Example Entry

````markdown
## Authentication Flow

**Context:** API authentication and authorization

**Relevance:** Security and best practices

**Content:**

- Authentication endpoints and requirements
- Token format and expiration
- Error handling
- Session management

## Example Entries

````markdown
## Authentication Best Practices

**Context:** Security-focused auth implementation

**Relevance:** All auth-related code

**Content:**

- How to implement JWT-based auth
- Token storage and retrieval
- Session management
- Security considerations

```markdown

```
````
````
````

## Key Files

- **agent.md** - This file (rules and guidelines)
- **docs/memory-architecture.md** - Full system architecture
- **docs/memory-usage-guide.md** - Usage guide
- **docs/memory-quick-reference.md** - Quick reference
- **CONVEX_IMPLEMENTATION.md** - Implementation guide
- **CONVEX_MIGRATION_SIMPLE.md** - Migration steps
- **src/routes/memory-demo.tsx** - Demo page
- **RULES.md** - Development rules

## Storage Rules

1. **LocalStorage:** Use for auth state (24h expiry)
2. **Convex Storage:** Memory in Convex database
3. **File System:** Memory files in local `memory/` directory
4. **No SQL:** Avoid raw SQL queries

## Search Rules

1. **Semantic Search:** Use Convex native vector search
2. **Keyword Search:** FTS5 for exact matches
3. **Hybrid Search:** Combine vector + keyword for best results
4. **Scoring:** Cosine similarity (0-1 to 1.0)

## Configuration

1. **Embedding Provider:** OpenAI text-embedding-3-small
2. **Dimensions:** 1536 (for OpenAI)
3. **Chunking:** 200 tokens, 50-token overlap
4. **Caching:** Full embedding cache
5. **Sync:** Automatic on file changes

## Quick Reference

### API Functions

```typescript
// Search memory
import { useQuery, useMutation } from 'convex/react'
import { api } from './convex/_generated/api'

const search = useMutation(api.memorySearch.vectorSearchChunks)
const results = await search({
  query: 'authentication best practices',
  agentId: 'user-123',
  maxResults: 5,
})

results.forEach((r) => {
  console.log(`Found: ${r.path}:${r.startLine}-${r.endLine}`)
})

// Sync memory
import { useMutation } from 'convex/react'
import { api } from './convex/_generated/api'

const sync = useMutation(api.admin.syncMemory)
await sync()
```

### Environment Variables

```bash
CONVEX_DEPLOYMENT_URL=https://your-project.convex.cloud
OPENAI_API_KEY=sk-...
```

## Performance

- **Storage:** ~3KB per 100 chunks
- **Search:** <50ms for vector search
- **Sync:** <100ms for file changes
- **Cache:** 90% hit rate (cached embeddings)

## Best Practices

1. **Atomic Storage:** One concept per entry
2. **Self-Contained:** Each entry should be understandable independently
3. **Context Rich:** Include examples and explanations
4. **Current:** Keep last updated dates
5. **Format:** Consistent structure and formatting

## Troubleshooting

| Issue             | Solution                              |
| ----------------- | ------------------------------------- |
| No search results | Check query spelling and try synonyms |
| Poor results      | Improve memory entry quality          |
| Slow search       | Check cache hit rate and sync status  |
| Sync errors       | Check file watcher and Convex status  |
| Auth errors       | Verify token format and expiration    |
