# Memory System Architecture

## Overview

The memory system is a sophisticated vector search and indexing engine that enables AI agents to store, index, and retrieve information across sessions. It combines semantic search (vector embeddings) with keyword search (FTS) for hybrid retrieval, supports multiple embedding providers, and provides automatic synchronization with workspace files.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Memory System                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           MemoryIndexManager                        │   │
│  │  - Index lifecycle management                       │   │
│  │  - File watching & sync                            │   │
│  │  - Search orchestration                            │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────┴────────────────────────────────┐   │
│  │              Search Layer                          │   │
│  │  ┌─────────────────┐  ┌─────────────────┐         │   │
│  │  │ Vector Search   │  │ Keyword Search  │         │   │
│  │  │ (Cosine Sim.)   │  │ (BM25 + FTS5)   │         │   │
│  │  └─────────────────┘  └─────────────────┘         │   │
│  │         │                      │                   │   │
│  │         └──────────┬───────────┘                   │   │
│  │                    │ Hybrid Merge                 │   │
│  └────────────────────┼────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────┴────────────────────────────────┐   │
│  │              Storage Layer                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐│   │
│  │  │   SQLite     │  │  sqlite-vec  │  │   FTS5     ││   │
│  │  │   Database   │  │  Extension   │  │  Extension ││   │
│  │  └──────────────┘  └──────────────┘  └────────────┘│   │
│  │         │                 │               │         │   │
│  │  ┌──────┴──────┐   ┌──────┴──────┐   ┌──┴──────┐  │   │
│  │  │ chunks_vec │   │    chunks   │   │fts_table │  │   │
│  │  └─────────────┘   │ files_table │   └─────────┘  │   │
│  │  ┌─────────────┐   └─────────────┘   ┌────────────┐│   │
│  │  │  embedding  │   ┌─────────────┐   │  meta     ││   │
│  │  │  cache      │   │  files      │   └────────────┘│   │
│  │  └─────────────┘   └─────────────┘                │   │
│  └────────────────────┼────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────┴────────────────────────────────┐   │
│  │         Embedding Providers                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│   │
│  │  │   OpenAI    │  │   Gemini    │  │   Local     ││   │
│  │  │   API       │  │   API       │  │ node-llama  ││   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. MemoryIndexManager

The central orchestrator of the memory system, located in `manager.ts`.

**Responsibilities:**

- Manages index lifecycle (creation, updates, reindexing)
- Handles file watching for automatic sync
- Coordinates search operations
- Manages embedding provider lifecycle
- Handles fallback providers on errors

**Key Features:**

- Singleton pattern per configuration (cached by key)
- Automatic sync triggers (file changes, search, intervals, session events)
- Safe reindexing with temporary database files
- Provider fallback mechanism
- Progress tracking for sync operations

**State Management:**

```typescript
class MemoryIndexManager {
  // Embedding configuration
  provider: EmbeddingProvider
  openAi?: OpenAiEmbeddingClient
  gemini?: GeminiEmbeddingClient
  fallbackFrom?: string
  fallbackReason?: string

  // Database
  db: DatabaseSync

  // Storage capabilities
  vector: { enabled: boolean; available: boolean; dims?: number }
  fts: { enabled: boolean; available: boolean }

  // Sync state
  dirty: boolean // Memory files need sync
  sessionsDirty: boolean // Session files need sync
  syncing: Promise<void> | null

  // Watchers and timers
  watcher: FSWatcher
  intervalTimer: NodeJS.Timeout
}
```

### 2. Search Layer

Hybrid search combining vector and keyword search in `hybrid.ts` and `manager-search.ts`.

**Vector Search:**

- Uses cosine similarity for semantic matching
- Leverages sqlite-vec extension for efficient ANN search
- Falls back to CPU-based cosine similarity if extension unavailable
- Supports source filtering (memory vs sessions)

**Keyword Search:**

- Uses SQLite FTS5 (Full-Text Search) extension
- BM25 ranking algorithm for relevance scoring
- Tokenizes and indexes text for fast phrase matching
- Supports query building with AND logic

**Hybrid Merge:**

```typescript
// Combines vector and keyword results with configurable weights
mergedScore = vectorWeight * vectorScore + textWeight * textScore

// Default weights: vectorWeight=0.7, textWeight=0.3
```

### 3. Storage Layer

SQLite database with three extensions managed by `memory-schema.ts` and `sqlite-vec.ts`.

**Database Schema:**

```sql
-- Metadata (configuration and index state)
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- File tracking
CREATE TABLE files (
  path TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'memory',
  hash TEXT NOT NULL,
  mtime INTEGER NOT NULL,
  size INTEGER NOT NULL
);

-- Text chunks with embeddings
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'memory',
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  hash TEXT NOT NULL,
  model TEXT NOT NULL,
  text TEXT NOT NULL,
  embedding TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Vector embeddings (sqlite-vec)
CREATE VIRTUAL TABLE chunks_vec USING vec0(
  id TEXT PRIMARY KEY,
  embedding FLOAT[dimensions]
);

-- Full-text search (FTS5)
CREATE VIRTUAL TABLE chunks_fts USING fts5(
  text,
  id UNINDEXED,
  path UNINDEXED,
  source UNINDEXED,
  model UNINDEXED,
  start_line UNINDEXED,
  end_line UNINDEXED
);

-- Embedding cache (avoid re-computation)
CREATE TABLE embedding_cache (
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  hash TEXT NOT NULL,
  embedding TEXT NOT NULL,
  dims INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (provider, model, provider_key, hash)
);
```

**Indexes:**

- `idx_chunks_path`: Speeds up file-based queries
- `idx_chunks_source`: Filters by source type
- `idx_embedding_cache_updated_at`: Prunes old cache entries

### 4. Embedding Providers

Multiple embedding backends supported via `embeddings.ts`, `embeddings-openai.ts`, `embeddings-gemini.ts`, and `node-llama.ts`.

**Provider Interface:**

```typescript
interface EmbeddingProvider {
  id: string // "openai" | "gemini" | "local"
  model: string // Model identifier
  embedQuery(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}
```

**OpenAI Provider:**

- Endpoint: `https://api.openai.com/v1/embeddings`
- Default model: `text-embedding-3-small`
- Supports batch API for efficiency
- Configurable via `models.providers.openai`

**Gemini Provider:**

- Endpoint: `https://generativelanguage.googleapis.com/v1beta`
- Default model: `gemini-embedding-001`
- Task types: RETRIEVAL_QUERY / RETRIEVAL_DOCUMENT
- Supports batch embedding via `batchEmbedContents`

**Local Provider:**

- Uses `node-llama-cpp` for on-device embeddings
- Default model: `hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf`
- Lazy-loads for faster startup
- Requires Node 22 LTS for optimal compatibility

**Provider Selection:**

```typescript
// Auto mode: tries local first, then openai, then gemini
provider: "auto"

// Explicit selection with fallback
provider: "openai"
fallback: "gemini"

// Local only
provider: "local"
local: {
  modelPath: "path/to/model.gguf",
  modelCacheDir: "cache/dir"
}
```

### 5. Chunking Strategy

Markdown content is chunked for embedding and indexing in `internal.ts`.

**Chunking Algorithm:**

```typescript
// Configuration
chunking: {
  tokens: 200,      // Max tokens per chunk
  overlap: 50       // Overlapping tokens between chunks
}

// Implementation
maxChars = tokens * 4        // ~4 chars per token
overlapChars = overlap * 4
```

**Process:**

1. Split content into lines
2. Accumulate lines until maxChars reached
3. Create chunk with line range (startLine, endLine)
4. Keep overlap characters for context continuity
5. Handle long lines by splitting at maxChars
6. Hash chunk text for deduplication

**Chunk Storage:**

```typescript
interface MemoryChunk {
  startLine: number
  endLine: number
  text: string
  hash: string // SHA-256 of text
}
```

### 6. File Sync Mechanisms

Automatic synchronization of memory and session files.

**Memory File Sync:**

- Watches `MEMORY.md` and `memory/` directory
- Triggers on file add/change/delete
- Debounced by `watchDebounceMs` (default 5000ms)
- Compares file hashes to detect changes
- Removes stale entries from database

**Session File Sync:**

- Monitors transcript directory for agent
- Subscribes to session transcript events
- Delta-based indexing: only processes changes
- Configurable thresholds:
  ```typescript
  sessions: {
    deltaBytes: 1024,      // Sync when 1KB added
    deltaMessages: 5      // Sync when 5 messages added
  }
  ```
- Extracts user/assistant messages only
- Normalizes whitespace and concatenates

**Interval Sync:**

- Periodic reindexing every `intervalMinutes`
- Ensures consistency across restarts
- Configurable or disabled

**Safe Reindexing:**

1. Create temporary database
2. Rebuild index in temporary DB
3. Verify no errors
4. Atomic swap: temp → target
5. Cleanup old files
6. Handle rollback on failure

### 7. Caching

Embedding caching to reduce API calls and improve performance.

**Cache Key:**

```typescript
;(provider, model, provider_key, hash)
```

**Cache Lifecycle:**

- Checked before generating embeddings
- Populated on successful embedding generation
- Pruned when exceeding `maxEntries`
- Seeded from old database during reindex

**Cache Benefits:**

- Avoids re-embedding unchanged content
- Survives reindexing
- Reduces API costs for remote providers
- Speeds up sync for local providers

## Data Flow

### Indexing Flow

```
┌──────────────┐
│ Memory File  │
│  (changed)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ File Watcher │
│ (chokidar)   │
└──────┬───────┘
       │ dirty = true
       ▼
┌──────────────────────────┐
│ Sync Triggered           │
│ (search/start/watch)     │
└──────┬───────────────────┘
       │
       ▼
┌──────────────┐
│ Read File    │
│ + Hash       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Check Cache  │
│ (hash match?)│
└──────┬───────┘
       │ No
       ▼
┌──────────────┐
│ Chunk Text   │
│ (200 tokens) │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Embed Chunks │
│ (provider)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Store Cache  │
└──────┴───────┘
       │
       ▼
┌──────────────┐
│ Write DB     │
│ - files      │
│ - chunks     │
│ - chunks_vec │
│ - chunks_fts │
└──────────────┘
```

### Search Flow

```
┌──────────────┐
│ User Query   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Embed Query  │
│ (provider)   │
└──────┬───────┘
       │
       ├──────────────────────────┐
       │                          │
       ▼                          ▼
┌──────────────┐        ┌──────────────┐
│ Vector       │        │ Keyword      │
│ Search       │        │ Search       │
│ (sqlite-vec) │        │ (FTS5)       │
└──────┬───────┘        └──────┬───────┘
       │                        │
       │ vectorScore            │ textScore
       │                        │
       └──────────┬─────────────┘
                  │
                  ▼
         ┌──────────────┐
         │ Merge        │
         │ (weighted)   │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Filter       │
         │ (minScore)   │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Limit        │
         │ (maxResults) │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Return Results│
         │ + Snippets   │
         └──────────────┘
```

### Provider Fallback Flow

```
┌──────────────┐
│ Primary      │
│ Provider     │
└──────┬───────┘
       │
       │ Error
       ▼
┌──────────────┐
│ Check Error  │
│ Type         │
└──────┬───────┘
       │
       │ Embedding error?
       ▼ Yes
┌──────────────┐
│ Activate     │
│ Fallback     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Create       │
│ New Provider │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Reindex with │
│ Fallback     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Continue     │
│ Operations   │
└──────────────┘
```

## Configuration Architecture

### Memory Search Configuration

```typescript
interface MemorySearchConfig {
  // Provider selection
  provider: 'openai' | 'gemini' | 'local' | 'auto'
  model: string
  fallback: 'openai' | 'gemini' | 'local' | 'none'

  // Sources to index
  sources: ['memory', 'sessions']

  // Chunking strategy
  chunking: {
    tokens: number // Default: 200
    overlap: number // Default: 50
  }

  // Query behavior
  query: {
    maxResults: number // Default: 10
    minScore: number // Default: 0.5
    hybrid: {
      enabled: boolean // Default: true
      vectorWeight: number // Default: 0.7
      textWeight: number // Default: 0.3
      candidateMultiplier: number // Default: 20
    }
  }

  // Storage configuration
  store: {
    path: string // SQLite database path
    vector: {
      enabled: boolean // Enable vector search
      extensionPath?: string // Custom sqlite-vec path
    }
  }

  // Sync configuration
  sync: {
    onSessionStart: boolean
    onSearch: boolean
    watch: boolean
    watchDebounceMs: number
    intervalMinutes: number
    sessions: {
      deltaBytes: number
      deltaMessages: number
    }
  }

  // Cache configuration
  cache: {
    enabled: boolean
    maxEntries?: number
  }

  // Remote API configuration
  remote?: {
    baseUrl?: string
    apiKey?: string
    headers?: Record<string, string>
    batch?: {
      enabled: boolean
      wait: boolean
      concurrency: number
      pollIntervalMs: number
      timeoutMinutes: number
    }
  }

  // Local model configuration
  local?: {
    modelPath?: string
    modelCacheDir?: string
  }
}
```

## Performance Considerations

### Indexing Performance

**Factors affecting indexing speed:**

- Number of files and chunks
- Embedding provider speed (local < remote)
- Batch size and concurrency
- Cache hit rate

**Optimizations:**

- Batching embeddings (up to 8000 tokens per batch)
- Concurrent embedding generation (default: 4)
- Embedding cache to avoid recomputation
- Incremental sync (only changed files)

**Typical Performance:**

- Local provider: ~100-500 chunks/second
- OpenAI/Gemini: ~10-50 chunks/second (network bound)
- With 90% cache hit: ~10x faster than cold start

### Search Performance

**Factors affecting search speed:**

- Number of indexed chunks
- Vector extension availability
- Hybrid search vs vector-only
- Candidate limit

**Optimizations:**

- sqlite-vec for approximate nearest neighbor (O(log n))
- FTS5 for keyword search (O(1) lookup)
- Candidate filtering before scoring
- Result caching

**Typical Performance:**

- Vector search with sqlite-vec: <10ms for 10k chunks
- Vector search CPU fallback: ~50ms for 10k chunks
- Keyword search: <5ms
- Hybrid search: <20ms

### Storage Requirements

**Per-chunk storage:**

- Text: ~800 bytes (200 tokens)
- Embedding: ~1.6KB (512 dims, float32)
- Metadata: ~200 bytes
- FTS index: ~400 bytes
- Vector index: ~800 bytes
- **Total: ~3.8KB/chunk**

**Cache storage:**

- Same as chunk (text not stored, only embedding)
- **Total: ~1.6KB/chunk**

**Example:**

- 1000 chunks = ~3.8MB index + ~1.6MB cache = ~5.4MB
- 10,000 chunks = ~54MB
- 100,000 chunks = ~540MB

## Error Handling

### Provider Errors

**Error Detection:**

- Network timeouts
- API rate limits
- Invalid API keys
- Model not found
- Provider unavailable

**Recovery Strategies:**

1. Retries with exponential backoff (max 3 attempts)
2. Provider fallback (if configured)
3. Graceful degradation (vector search disabled)
4. Error logging and reporting

**Example Error Flow:**

```
OpenAI API timeout
  → Retry 1 (500ms delay)
  → Retry 2 (1000ms delay)
  → Retry 3 (2000ms delay)
  → Check fallback enabled?
    → Yes: Switch to Gemini, reindex
    → No: Return error to caller
```

### Sync Errors

**Error Types:**

- File read errors
- Embedding generation errors
- Database write errors
- Extension load errors

**Handling Strategy:**

- Individual file failures don't abort sync
- Log errors per file
- Continue with remaining files
- Mark manager dirty for retry

**Recovery:**

- Manual sync trigger
- Automatic retry on next operation
- Safe reindex as last resort

### Search Errors

**Error Types:**

- Vector extension not loaded
- FTS not available
- Invalid query format
- Database locked

**Handling Strategy:**

- Fallback to alternative search method
- Return empty results on critical errors
- Log warnings for non-critical errors
- Report errors via status()

**Example:**

```
Vector search fails
  → FTS available?
    → Yes: Return keyword-only results
    → No: Return empty results, log error
```

## Security Considerations

### API Key Management

- Keys stored in config or environment
- Never logged or exposed in errors
- Provider-specific key resolution
- Support for custom headers

### File Access

- Path validation to prevent directory traversal
- Workspace directory enforcement
- Source filtering (memory vs sessions)
- Relative path normalization

### Data Privacy

- Embeddings sent to remote providers
- Session transcript indexing respects privacy settings
- No sensitive data in error messages
- Local provider for offline/private use

## Testing Strategy

### Unit Tests

- Chunking algorithm correctness
- Hash computation
- Cosine similarity
- BM25 score conversion
- FTS query building
- Path normalization

### Integration Tests

- End-to-end indexing flow
- Search accuracy with test queries
- Provider switching
- Fallback activation
- Cache seeding and pruning

### Performance Tests

- Large-scale indexing (10k+ chunks)
- Search latency benchmarks
- Concurrent access patterns
- Memory usage profiling

## Future Enhancements

### Potential Improvements

1. **Advanced Chunking**
   - Semantic chunking based on topic boundaries
   - Hierarchical chunking for multi-level context
   - Markdown-aware chunking (respect headers)

2. **Better Ranking**
   - Learning-to-rank models
   - User feedback integration
   - Recency bias
   - Source prioritization

3. **Richer Metadata**
   - Tag support for content categorization
   - Timestamp-based filtering
   - Author attribution
   - Content type classification

4. **Improved Scalability**
   - Distributed indexing
   - Sharded databases
   - Approximate search at scale
   - Background indexing queues

5. **Advanced Features**
   - Query expansion and reformulation
   - Multi-language support
   - Image/video embeddings
   - Cross-modal search

## Documentation Rules

### Keep It Simple

✅ **Be Concise**: Focus on essential information, avoid verbosity
✅ **One Concept Per Section**: Keep each topic focused and digestible
✅ **Use Examples Over Explanations**: Code examples > long explanations
✅ **Progressive Detail**: Link to more detailed docs, don't duplicate content
✅ **Avoid Repetition**: Don't repeat the same information in multiple docs

### When To Document

1. **Architecture**: What it does, not how it works
2. **Usage**: How to use it, with minimal examples
3. **API**: Function signatures only, not implementation details
4. **Quick Start**: Get running in 5 minutes or less

### File Organization

- **`docs/memory-architecture.md`**: High-level design only
- **`docs/memory-usage-guide.md`**: Developer guide with examples
- **`docs/memory-quick-reference.md`**: API cheat sheet
- **`CONVEX_IMPLEMENTATION.md`**: Setup and integration

### Content Guidelines

- Start with **why** it matters
- Include **when** to use it
- Show **code examples** for common tasks
- Link to **detailed docs** for deep dives

---

## Personalization FAQ

### Does memory remember my name?

**No.** The memory system does not store personal information like "user's name is X". It operates as a semantic knowledge base focused on content rather than personal details.

### How memory is organized

Memory is organized by `agentId`, not by individual users. Each agent has their own isolated memory space:

```typescript
// Each agent has their own memory space
memoryFiles: {
  path: "memory/auth.md",
  agentId: "agent-123",  // Agent 1's memory
}

memoryChunks: {
  path: "memory/auth.md",
  agentId: "agent-123",  // Agent 1's chunk
  text: "Authentication should use JWT tokens...",
}
```

### What this means

- **Per-Agent Isolation**: Memory is shared between agents with the same `agentId`, not per user
- **Shared Knowledge**: All content added to memory is searchable by all agents using the same ID
- **No Personal Store**: The system doesn't currently have a user profile or personal preference system

### How to add personalization

If you need user-specific features, consider:

1. **User Metadata Table** (Future Enhancement)

   ```typescript
   users: defineTable({
     userId: v.id('users'),
     preferences: v.optional(
       v.object({
         name: v.string(),
         timezone: v.string(),
         theme: v.string(),
       }),
     ),
   })
   ```

2. **Personal Memory Tags**
   - Add tags to chunks for user preferences
   - Filter results by user-specific tags
   - Example: `tags: v.array(v.string())`

3. **User-Associated Context**
   - Link chunks to user profile
   - Personalize search results based on user history
   - Add "seen by user" timestamps

### Current Capabilities

✅ **Cross-Agent Sharing**: Multiple agents can share the same memory
✅ **Semantic Search**: Find relevant information based on meaning
✅ **Context Retrieval**: Get surrounding chunks for better understanding
✅ **Auto-Sync**: Updates when files change
✅ **Per-Agent Organization**: Memory organized by `agentId`
🚫 **Personal Store**: No user profiles, works as semantic knowledge base

### What This Means

Memory is organized by agent ID, not by user. Each agent (or session) has their own isolated memory space. If you tell the AI "my name is John", the memory system will store this information and make it searchable, but not as personal profile data.

### How It Works

```typescript
// Two different sessions, same agent ID
// Session 1: User says "my name is John"
// Session 2: User says "my name is John"
// Both sessions share agentId "agent-123"
// Both access the SAME memory content

memoryFiles: {
  path: "memory/auth.md",
  agentId: "agent-123",  // Same agent ID
}

memoryChunks: {
  path: "memory/auth.md",
  agentId: "agent-123",  // Same agent ID
  text: "Authentication should use JWT tokens...",
}
```

**Key Point:** The system is designed as a **knowledge repository**, not a personal memory assistant. It stores **semantic information** that can be searched, not **personal facts** about users.

---

## Bun Runtime Rules

### Example Usage

```typescript
// All agents with agentId "agent-123" share this memory
const results = await searchMemory({
  agentId: 'agent-123',
  query: 'authentication',
})

// Results come from shared memory, not user-specific
```

---

## Bun Runtime Rules

```bash
# Start Convex dev server
bunx npx convex dev

# Start the app
bunx --bun run dev
```

---

## Conclusion

The memory system provides a robust, scalable foundation for persistent knowledge storage and retrieval.

Key strengths:

- **Flexible:** Multiple providers, configurable behavior
- **Performant:** Caching, batching, extensions
- **Reliable:** Error handling, fallbacks, safe operations
- **Extensible:** Modular design, clear interfaces

For detailed usage instructions, see `docs/memory-usage-guide.md`.
