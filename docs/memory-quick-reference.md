# Memory System - Quick Reference

## Overview

The memory system is a vector-based search and indexing engine that enables AI agents to store and retrieve information across sessions.

## File Structure

```
memory/
├── manager.ts              # Core manager (index, sync, search)
├── search-manager.ts       # Entry point for getting manager
├── manager-search.ts       # Search implementations
├── hybrid.ts              # Hybrid search merging
├── embeddings.ts          # Provider abstraction
├── embeddings-openai.ts    # OpenAI provider
├── embeddings-gemini.ts    # Gemini provider
├── node-llama.ts          # Local provider
├── internal.ts            # Utilities (chunking, hashing)
├── memory-schema.ts        # Database schema
├── sqlite-vec.ts          # Vector extension loader
└── ...                    # Other supporting files

docs/
├── memory-architecture.md  # Full architecture docs
└── memory-usage-guide.md   # Usage guide for AI models

agent.md                   # AI agent rules and guidelines
```

## Quick API Reference

### Get Manager

```typescript
import { getMemorySearchManager } from './memory/index.js'

const { manager, error } = await getMemorySearchManager({
  cfg: config,
  agentId: 'agent-id',
})
```

### Search

```typescript
const results = await manager.search('query', {
  maxResults: 10,
  minScore: 0.5,
  sessionKey: 'session-id',
})
```

### Read File

```typescript
const { text, path } = await manager.readFile({
  relPath: 'memory/file.md',
  from: 1,
  lines: 50,
})
```

### Sync

```typescript
await manager.sync({
  reason: 'manual',
  progress: (update) => console.log(update),
})
```

### Status

```typescript
const status = manager.status()
// status.files, status.chunks, status.provider, status.model
```

## Key Concepts

- **Embeddings:** Vector representations of text for semantic search
- **Vector Search:** Cosine similarity for semantic matching
- **FTS:** Full-text search with BM25 ranking
- **Hybrid Search:** Combined vector and keyword search
- **Chunking:** Splitting text into smaller segments for embedding
- **Cache:** Stored embeddings to avoid recomputation
- **Sync:** Automatic indexing of file changes

## Providers

| Provider | Type   | Default Model          | Speed  |
| -------- | ------ | ---------------------- | ------ |
| openai   | Remote | text-embedding-3-small | Medium |
| gemini   | Remote | gemini-embedding-001   | Medium |
| local    | Local  | embeddinggemma-300M    | Fast   |

## Search Results

```typescript
{
  path: string // Relative file path
  startLine: number // Start line number
  endLine: number // End line number
  score: number // Relevance score (0-1)
  snippet: string // Text snippet
  source: 'memory' | 'sessions' // Source type
}
```

## Configuration

```typescript
{
  provider: "openai" | "gemini" | "local" | "auto";
  model: string;
  sources: ["memory", "sessions"];
  chunking: { tokens: 200, overlap: 50 };
  query: { maxResults: 10, minScore: 0.5 };
  hybrid: { enabled: true, vectorWeight: 0.7, textWeight: 0.3 };
  sync: { onSearch: true, watch: true, intervalMinutes: 5 };
  store: { path: "memory.db", vector: { enabled: true } };
}
```

## Memory File Organization

```
workspace/
├── MEMORY.md          # Primary memory file
└── memory/            # Detailed memory
    ├── project-info.md
    ├── conventions.md
    └── decisions.md
```

## Common Patterns

### Search Before Acting

```typescript
const results = await manager.search(task)
if (results.length > 0) {
  // Use existing knowledge
}
```

### Store Learnings

```typescript
// Write to memory/*.md
// Sync will automatically index
```

### Context-Rich Answers

```typescript
const results = await manager.search(question)
const context = results.map((r) => r.snippet).join('\n')
return generateAnswerWithContext(question, context)
```

## Troubleshooting

| Issue        | Solution                                           |
| ------------ | -------------------------------------------------- |
| No results   | Lower minScore, try different queries              |
| Poor results | Improve memory entries, add context                |
| Sync errors  | Check API keys, network, provider availability     |
| Slow search  | Reduce maxResults, disable FTS, use local provider |

## Documentation

- **Architecture:** `docs/memory-architecture.md` - Full system architecture
- **Usage Guide:** `docs/memory-usage-guide.md` - How to use memory system
- **Agent Rules:** `agent.md` - Guidelines for AI agents using memory

## Key Files

| File                       | Purpose               |
| -------------------------- | --------------------- |
| `memory/manager.ts`        | Core index manager    |
| `memory/search-manager.ts` | Entry point           |
| `memory/embeddings.ts`     | Provider abstraction  |
| `memory/hybrid.ts`         | Hybrid search merging |
| `memory/internal.ts`       | Chunking, hashing     |
| `memory/memory-schema.ts`  | Database schema       |
