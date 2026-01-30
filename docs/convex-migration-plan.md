# Convex Backend Migration Plan for Memory System

## Executive Summary

This document outlines a comprehensive plan to migrate the memory system from SQLite to Convex as the backend. The migration will leverage Convex's native vector database capabilities, real-time features, and managed infrastructure.

## Table of Contents

1. [Current Architecture Review](#current-architecture-review)
2. [Why Convex?](#why-convex)
3. [Architecture Comparison](#architecture-comparison)
4. [Schema Design](#schema-design)
5. [Migration Strategy](#migration-strategy)
6. [Implementation Plan](#implementation-plan)
7. [API Design](#api-design)
8. [Performance Optimization](#performance-optimization)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Plan](#deployment-plan)
11. [Rollback Strategy](#rollback-strategy)
12. [Timeline and Milestones](#timeline-and-milestones)
13. [Risk Assessment](#risk-assessment)

---

## Current Architecture Review

### SQLite-Based Architecture

```
Memory System
├── SQLite Database (local file)
│   ├── files table
│   ├── chunks table
│   ├── embedding_cache table
│   ├── meta table
│   ├── chunks_vec (virtual table - sqlite-vec)
│   └── chunks_fts (virtual table - FTS5)
├── File System Watcher (chokidar)
├── Embedding Providers (OpenAI, Gemini, Local)
└── Sync Mechanisms (watch, interval, session events)
```

### Current Limitations

1. **Scalability**: Local SQLite doesn't scale well across multiple instances
2. **Real-time**: No built-in real-time synchronization
3. **Cloud-Native**: Requires manual deployment and scaling
4. **Vector Search**: sqlite-vec has limitations compared to production vector databases
5. **Collaboration**: Difficult to share memory across different agents/instances
6. **Maintenance**: Requires manual backup, migration, and scaling

---

## Why Convex?

### Key Advantages

1. **Native Vector Database**
   - Built-in vector search with cosine similarity
   - Optimized for large-scale vector operations
   - Automatic indexing and query optimization

2. **Real-Time Subscriptions**
   - Automatic propagation of changes
   - Reactive queries for live updates
   - Multi-client synchronization

3. **Managed Infrastructure**
   - Automatic scaling
   - Built-in backup and recovery
   - No database administration required

4. **Developer Experience**
   - TypeScript-first API
   - Strongly typed schema
   - Built-in authentication and authorization

5. **Edge Computing**
   - Low-latency queries via edge functions
   - Global distribution
   - Automatic CDN integration

### Feature Comparison

| Feature          | SQLite                 | Convex              |
| ---------------- | ---------------------- | ------------------- |
| Vector Search    | sqlite-vec (extension) | Native              |
| Full-Text Search | FTS5 (extension)       | Built-in            |
| Real-time Sync   | No (file watcher only) | Yes (subscriptions) |
| Scaling          | Manual                 | Automatic           |
| Cloud Native     | No                     | Yes                 |
| Authentication   | Custom                 | Built-in            |
| Multi-Instance   | No                     | Yes                 |
| Backup           | Manual                 | Automatic           |

---

## Architecture Comparison

### Before (SQLite)

```typescript
┌─────────────────────────────────────┐
│      MemoryIndexManager             │
├─────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────┐     │
│  │    Local SQLite DB         │     │
│  │  ├── files                │     │
│  │  ├── chunks                │     │
│  │  ├── embedding_cache       │     │
│  │  ├── chunks_vec (vector)   │     │
│  │  └── chunks_fts (fts)      │     │
│  └────────────────────────────┘     │
│                                      │
│  ┌────────────────────────────┐     │
│  │    File Watcher            │     │
│  │    (chokidar)              │     │
│  └────────────────────────────┘     │
│                                      │
└─────────────────────────────────────┘
```

### After (Convex)

```typescript
┌─────────────────────────────────────┐
│      ConvexMemoryManager            │
├─────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────┐     │
│  │    Convex Client            │     │
│  │  (ConvexHttpClient)         │     │
│  └──────────┬─────────────────┘     │
│             │                       │
│  ┌──────────┴─────────────────┐     │
│  │                            │     │
│  ▼                            ▼     │
│ ┌──────────────┐      ┌──────────────┐│
│ │Convex Backend│      │Convex Functions││
│ │   (Cloud)    │      │   (Edge)     ││
│ └──────────────┘      └──────────────┘│
│  ├── files              ├── searchFiles│
│  ├── chunks             ├── searchChunks│
│  ├── embeddings         ├── syncMemory  │
│  └── vector indexes     └── subscribe  │
│                                      │
│  ┌────────────────────────────┐     │
│  │    Convex Subscriptions    │     │
│  │    (Real-time Sync)        │     │
│  └────────────────────────────┘     │
│                                      │
└─────────────────────────────────────┘
```

---

## Schema Design

### Convex Schema Definition

```typescript
// convex/schema.ts

import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Files metadata
  files: defineTable({
    path: v.string(),
    source: v.union(v.literal('memory'), v.literal('sessions')),
    hash: v.string(),
    mtime: v.number(),
    size: v.number(),
    agentId: v.string(),
    lastSyncedAt: v.optional(v.number()),
  })
    .index('by_path', ['path', 'agentId'])
    .index('by_source', ['source', 'agentId'])
    .index('by_mtime', ['mtime']),

  // Text chunks with embeddings
  chunks: defineTable({
    path: v.string(),
    source: v.union(v.literal('memory'), v.literal('sessions')),
    startLine: v.number(),
    endLine: v.number(),
    hash: v.string(),
    model: v.string(),
    text: v.string(),
    embedding: v.array(v.number()),
    updatedAt: v.number(),
    agentId: v.string(),
    fileId: v.id('files'),
  })
    .index('by_file', ['fileId'])
    .index('by_path', ['path', 'agentId'])
    .index('by_source', ['source', 'agentId'])
    .index('by_updated', ['updatedAt'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536, // OpenAI default
      filterFields: ['agentId', 'model', 'source'],
    }),

  // Embedding cache
  embeddingCache: defineTable({
    provider: v.string(),
    model: v.string(),
    providerKey: v.string(),
    hash: v.string(),
    embedding: v.array(v.number()),
    dims: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_composite', ['provider', 'model', 'providerKey', 'hash'])
    .index('by_updated', ['updatedAt']),

  // Metadata
  meta: defineTable({
    key: v.string(),
    value: v.string(),
    agentId: v.string(),
  }).index('by_key', ['key', 'agentId']),

  // Sync state
  syncState: defineTable({
    agentId: v.string(),
    lastFullSync: v.number(),
    pendingFiles: v.array(v.string()),
    dirty: v.boolean(),
    error: v.optional(v.string()),
  }).index('by_agent', ['agentId']),
})
```

### Index Strategy

```typescript
// Primary indexes
- files.by_path: Lookups by file path
- files.by_source: Filtering by source type
- chunks.by_file: Join operations
- chunks.by_embedding: Vector search (native)
- chunks.by_updated: Incremental sync

// Vector index configuration
- Dimensions: 1536 (OpenAI), 768 (Gemini), 384 (Local)
- Metric: cosine similarity
- Filter fields: agentId, model, source (for multi-tenant)
```

---

## Migration Strategy

### Phase 1: Dual-Write (Parallel)

**Duration**: 2 weeks

**Objective**: Run both SQLite and Convex in parallel, writing to both.

```typescript
class HybridMemoryManager {
  private sqliteManager: MemoryIndexManager
  private convexManager: ConvexMemoryManager

  async search(query: string): Promise<SearchResult[]> {
    // Search both backends
    const [sqliteResults, convexResults] = await Promise.all([
      this.sqliteManager.search(query),
      this.convexManager.search(query),
    ])

    // Compare and log differences
    this.compareResults(sqliteResults, convexResults)

    // Return SQLite results (current truth)
    return sqliteResults
  }

  async sync(): Promise<void> {
    // Sync to both backends
    await Promise.all([this.sqliteManager.sync(), this.convexManager.sync()])
  }
}
```

**Acceptance Criteria**:

- Convex search results match SQLite results within 5% variance
- No data loss in dual-write
- Performance impact < 20% overhead

### Phase 2: Read-Only Convex

**Duration**: 1 week

**Objective**: Read from Convex, write to both.

```typescript
class HybridMemoryManager {
  async search(query: string): Promise<SearchResult[]> {
    // Read from Convex only
    const results = await this.convexManager.search(query)

    // Verify against SQLite (canary)
    await this.verifyResults(results)

    return results
  }

  async sync(): Promise<void> {
    // Write to both
    await Promise.all([this.sqliteManager.sync(), this.convexManager.sync()])
  }
}
```

**Acceptance Criteria**:

- Convex search latency < SQLite search latency
- 100% query accuracy verified
- No missing results

### Phase 3: Convex-Only

**Duration**: 1 week

**Objective**: Complete migration to Convex, keep SQLite as backup.

```typescript
class ConvexMemoryManager {
  async search(query: string): Promise<SearchResult[]> {
    return await this.convexBackend.search(query)
  }

  async sync(): Promise<void> {
    return await this.convexBackend.sync()
  }

  // Backup to SQLite (for rollback)
  async backup(): Promise<void> {
    await this.sqliteBackup.sync()
  }
}
```

**Acceptance Criteria**:

- All operations use Convex
- SQLite backup maintained for 30 days
- Performance meets or exceeds baseline

---

## Implementation Plan

### Step 1: Setup Convex Project

**Tasks**:

1. Create Convex project
2. Initialize schema
3. Set up authentication
4. Configure environment variables

```bash
npx convex dev
npx convex deploy
```

**Configuration**:

```typescript
// convex/config.json
{
  "projectId": "your-project-id",
  "team": "your-team",
  "functions": "./convex/functions",
  "auth": {
    "providers": ["anonymous"]
  }
}
```

### Step 2: Implement Convex Schema

**Tasks**:

1. Define Convex schema (see Schema Design section)
2. Create indexes
3. Set up vector indexes
4. Deploy schema

```bash
npx convex deploy
```

**Files**:

```
convex/
├── schema.ts
├── functions/
│   ├── files.ts
│   ├── chunks.ts
│   ├── search.ts
│   └── sync.ts
```

### Step 3: Implement Convex Functions

**Search Function**:

```typescript
// convex/functions/search.ts

import { query } from './_generated/server'
import { v } from 'convex/values'

export const searchChunks = query({
  args: {
    query: v.string(),
    agentId: v.string(),
    maxResults: v.optional(v.number()),
    minScore: v.optional(v.number()),
    source: v.optional(v.union(v.literal('memory'), v.literal('sessions'))),
  },
  handler: async (ctx, args) => {
    const { query, agentId, maxResults = 10, minScore = 0.5, source } = args

    // Get query embedding
    const embedding = await getQueryEmbedding(query)

    // Vector search
    const results = await ctx.db
      .query('chunks')
      .withIndex('by_embedding', (q) =>
        q
          .withVectorFields('embedding')
          .nearest(embedding, { numResults: maxResults * 2 })
          .filter((q) =>
            q.eq('agentId', agentId).and(source ? q.eq('source', source) : q),
          ),
      )
      .take(maxResults)

    // Filter by score and format results
    return results
      .filter((r) => r.score >= minScore)
      .map((r) => ({
        id: r._id.toString(),
        path: r.path,
        startLine: r.startLine,
        endLine: r.endLine,
        score: r.score,
        snippet: r.text.slice(0, 700),
        source: r.source,
      }))
  },
})
```

**Sync Function**:

```typescript
// convex/functions/sync.ts

import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const syncFile = mutation({
  args: {
    path: v.string(),
    source: v.union(v.literal('memory'), v.literal('sessions')),
    hash: v.string(),
    mtime: v.number(),
    size: v.number(),
    agentId: v.string(),
    chunks: v.array(
      v.object({
        startLine: v.number(),
        endLine: v.number(),
        hash: v.string(),
        text: v.string(),
        embedding: v.array(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { path, source, hash, mtime, size, agentId, chunks } = args

    // Check if file exists
    const existingFile = await ctx.db
      .query('files')
      .withIndex('by_path', (q) => q.eq('path', path).eq('agentId', agentId))
      .first()

    // Update or create file record
    const fileId =
      existingFile?._id ||
      (await ctx.db.insert('files', {
        path,
        source,
        hash,
        mtime,
        size,
        agentId,
      }))

    if (!existingFile || existingFile.hash !== hash) {
      // Delete old chunks
      if (existingFile) {
        const oldChunks = await ctx.db
          .query('chunks')
          .withIndex('by_file', (q) => q.eq('fileId', fileId))
          .collect()

        for (const chunk of oldChunks) {
          await ctx.db.delete(chunk._id)
        }
      }

      // Insert new chunks
      for (const chunk of chunks) {
        await ctx.db.insert('chunks', {
          path,
          source,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          hash: chunk.hash,
          model: 'text-embedding-3-small', // TODO: Get from config
          text: chunk.text,
          embedding: chunk.embedding,
          updatedAt: Date.now(),
          agentId,
          fileId,
        })
      }
    }

    return { fileId: fileId.toString() }
  },
})
```

### Step 4: Create Convex Client

```typescript
// memory/convex-client.ts

import { ConvexHttpClient } from 'convex/browser'

export class ConvexMemoryBackend {
  private client: ConvexHttpClient

  constructor(config: { deploymentUrl: string }) {
    this.client = new ConvexHttpClient(config.deploymentUrl)
  }

  async search(params: {
    query: string
    agentId: string
    maxResults?: number
    minScore?: number
    source?: 'memory' | 'sessions'
  }): Promise<SearchResult[]> {
    return await this.client.query('functions/search:searchChunks', params)
  }

  async syncFile(params: {
    path: string
    source: 'memory' | 'sessions'
    hash: string
    mtime: number
    size: number
    agentId: string
    chunks: Array<{
      startLine: number
      endLine: number
      hash: string
      text: string
      embedding: number[]
    }>
  }): Promise<{ fileId: string }> {
    return await this.client.mutation('functions/sync:syncFile', params)
  }

  async getFile(params: {
    path: string
    agentId: string
  }): Promise<File | null> {
    return await this.client.query('functions/files:getFile', params)
  }
}
```

### Step 5: Create Convex Memory Manager

```typescript
// memory/convex-manager.ts

export class ConvexMemoryManager {
  private backend: ConvexMemoryBackend
  private provider: EmbeddingProvider
  private chunking: { tokens: number; overlap: number }

  async search(
    query: string,
    opts?: {
      maxResults?: number
      minScore?: number
      sessionKey?: string
    },
  ): Promise<MemorySearchResult[]> {
    const results = await this.backend.search({
      query,
      agentId: this.agentId,
      maxResults: opts?.maxResults || 10,
      minScore: opts?.minScore || 0.5,
    })

    return results
  }

  async sync(): Promise<void> {
    // Sync memory files
    const memoryFiles = await listMemoryFiles(this.workspaceDir)

    for (const file of memoryFiles) {
      await this.syncFile(file, 'memory')
    }

    // Sync session files
    const sessionFiles = await this.listSessionFiles()

    for (const file of sessionFiles) {
      await this.syncFile(file, 'sessions')
    }
  }

  private async syncFile(
    absPath: string,
    source: 'memory' | 'sessions',
  ): Promise<void> {
    const stat = await fs.stat(absPath)
    const content = await fs.readFile(absPath, 'utf-8')
    const hash = hashText(content)
    const path = path.relative(this.workspaceDir, absPath)

    // Chunk the content
    const chunks = await this.chunkAndEmbed(content)

    // Sync to Convex
    await this.backend.syncFile({
      path,
      source,
      hash,
      mtime: stat.mtimeMs,
      size: stat.size,
      agentId: this.agentId,
      chunks,
    })
  }

  private async chunkAndEmbed(content: string): Promise<
    Array<{
      startLine: number
      endLine: number
      hash: string
      text: string
      embedding: number[]
    }>
  > {
    const chunks = chunkMarkdown(content, this.chunking)
    const texts = chunks.map((c) => c.text)
    const embeddings = await this.provider.embedBatch(texts)

    return chunks.map((chunk, i) => ({
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      hash: chunk.hash,
      text: chunk.text,
      embedding: embeddings[i],
    }))
  }
}
```

### Step 6: Implement Real-Time Subscriptions

```typescript
// memory/convex-subscription.ts

import { ConvexReactClient } from 'convex/react'

export function useMemoryUpdates(agentId: string) {
  const convex = new ConvexReactClient(config.deploymentUrl)

  // Subscribe to file updates
  const files = convex.useQuery('functions/files:watchFiles', { agentId })

  // Subscribe to chunk updates
  const chunks = convex.useQuery('functions/chunks:watchChunks', { agentId })

  // Trigger sync when changes detected
  useEffect(() => {
    if (files?.length > 0 || chunks?.length > 0) {
      // Trigger local sync
      triggerSync(agentId)
    }
  }, [files, chunks])

  return { files, chunks }
}
```

### Step 7: Migrate Data

**Migration Script**:

```typescript
// scripts/migrate-to-convex.ts

import { ConvexMemoryBackend } from '../memory/convex-client.js'
import { getMemorySearchManager } from '../memory/index.js'

async function migrate() {
  const sqliteManager = await getMemorySearchManager({
    cfg: config,
    agentId: 'agent-id',
  })

  const convexBackend = new ConvexMemoryBackend({
    deploymentUrl: config.convex.deploymentUrl,
  })

  // Migrate files
  const files = await sqliteManager.listFiles()

  for (const file of files) {
    const content = await sqliteManager.readFile({
      relPath: file.path,
    })

    await convexBackend.syncFile({
      path: file.path,
      source: file.source,
      hash: file.hash,
      mtime: file.mtime,
      size: file.size,
      agentId: 'agent-id',
      chunks: await extractChunks(content.text),
    })
  }

  console.log('Migration complete')
}
```

### Step 8: Update Configuration

```typescript
// config/memory-search.ts

interface MemorySearchConfig {
  backend: 'sqlite' | 'convex'
  provider: 'openai' | 'gemini' | 'local' | 'auto'
  // ... existing config
  convex?: {
    deploymentUrl: string
  }
}
```

---

## API Design

### Convex Functions API

#### Search Functions

```typescript
// Search chunks by vector similarity
export const searchChunks = query({
  args: {
    query: v.string(),
    agentId: v.string(),
    maxResults: v.optional(v.number()),
    minScore: v.optional(v.number()),
    source: v.optional(v.union(v.literal('memory'), v.literal('sessions'))),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      path: v.string(),
      startLine: v.number(),
      endLine: v.number(),
      score: v.number(),
      snippet: v.string(),
      source: v.union(v.literal('memory'), v.literal('sessions')),
    }),
  ),
})

// Search files by metadata
export const searchFiles = query({
  args: {
    agentId: v.string(),
    source: v.optional(v.union(v.literal('memory'), v.literal('sessions'))),
    pathPattern: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      path: v.string(),
      hash: v.string(),
      mtime: v.number(),
      size: v.number(),
      source: v.union(v.literal('memory'), v.literal('sessions')),
    }),
  ),
})
```

#### Sync Functions

```typescript
// Sync a single file
export const syncFile = mutation({
  args: {
    path: v.string(),
    source: v.union(v.literal('memory'), v.literal('sessions')),
    hash: v.string(),
    mtime: v.number(),
    size: v.number(),
    agentId: v.string(),
    chunks: v.array(
      v.object({
        startLine: v.number(),
        endLine: v.number(),
        hash: v.string(),
        text: v.string(),
        embedding: v.array(v.number()),
      }),
    ),
  },
  returns: v.object({
    fileId: v.string(),
  }),
})

// Delete a file
export const deleteFile = mutation({
  args: {
    fileId: v.id('files'),
    agentId: v.string(),
  },
  returns: v.null(),
})
```

#### Subscription Functions

```typescript
// Watch files for changes
export const watchFiles = query({
  args: {
    agentId: v.string(),
  },
  returns: v.array(
    v.object({
      id: v.id('files'),
      path: v.string(),
      hash: v.string(),
      mtime: v.number(),
      size: v.number(),
      source: v.union(v.literal('memory'), v.literal('sessions')),
    }),
  ),
})

// Watch chunks for changes
export const watchChunks = query({
  args: {
    agentId: v.string(),
  },
  returns: v.array(
    v.object({
      id: v.id('chunks'),
      path: v.string(),
      text: v.string(),
      updatedAt: v.number(),
    }),
  ),
})
```

#### Utility Functions

```typescript
// Get file by path
export const getFile = query({
  args: {
    path: v.string(),
    agentId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      id: v.id('files'),
      path: v.string(),
      hash: v.string(),
      mtime: v.number(),
      size: v.number(),
      source: v.union(v.literal('memory'), v.literal('sessions')),
    }),
  ),
})

// Get sync status
export const getSyncStatus = query({
  args: {
    agentId: v.string(),
  },
  returns: v.object({
    lastFullSync: v.number(),
    pendingFiles: v.array(v.string()),
    dirty: v.boolean(),
  }),
})

// Get embedding from cache
export const getCachedEmbedding = query({
  args: {
    provider: v.string(),
    model: v.string(),
    providerKey: v.string(),
    hash: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      embedding: v.array(v.number()),
      dims: v.optional(v.number()),
    }),
  ),
})

// Cache an embedding
export const cacheEmbedding = mutation({
  args: {
    provider: v.string(),
    model: v.string(),
    providerKey: v.string(),
    hash: v.string(),
    embedding: v.array(v.number()),
    dims: v.optional(v.number()),
  },
  returns: v.null(),
})
```

---

## Performance Optimization

### Vector Search Optimization

```typescript
// Configure vector index for optimal performance
{
  index: "by_embedding",
  dimensions: 1536,
  metric: "cosine",
  numProbes: 10,        // Number of probes for ANN search
  efConstruction: 200,   // HNSW efConstruction parameter
  efSearch: 100,         // HNSW efSearch parameter
}
```

### Batch Operations

```typescript
// Batch sync multiple files
export const batchSyncFiles = mutation({
  args: {
    files: v.array(
      v.object({
        path: v.string(),
        source: v.union(v.literal('memory'), v.literal('sessions')),
        hash: v.string(),
        mtime: v.number(),
        size: v.number(),
        agentId: v.string(),
        chunks: v.array(/* ... */),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Process in batches
    const batchSize = 10
    for (let i = 0; i < args.files.length; i += batchSize) {
      const batch = args.files.slice(i, i + batchSize)
      await Promise.all(batch.map((file) => ctx.db.insert('files', file)))
    }
  },
})
```

### Query Optimization

```typescript
// Use indexes efficiently
export const optimizedSearch = query({
  args: {
    agentId: v.string(),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    // Use vector index with filters
    const results = await ctx.db
      .query('chunks')
      .withIndex(
        'by_embedding',
        (q) =>
          q
            .withVectorFields('embedding')
            .nearest(embedding, { numResults: 100 })
            .filter((q) => q.eq('agentId', args.agentId)), // Use indexed field
      )
      .take(10)

    return results
  },
})
```

### Caching Strategy

```typescript
// Implement client-side caching
class CachedConvexBackend {
  private cache = new Map<string, { data: any; expiresAt: number }>()

  async search(query: string): Promise<SearchResult[]> {
    const cacheKey = `search:${query}`
    const cached = this.cache.get(cacheKey)

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    const results = await this.backend.search({ query })
    this.cache.set(cacheKey, {
      data: results,
      expiresAt: Date.now() + 60000, // 1 minute
    })

    return results
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/convex-client.test.ts

describe('ConvexMemoryBackend', () => {
  it('should search chunks', async () => {
    const backend = new ConvexMemoryBackend(mockConfig)
    const results = await backend.search({
      query: 'test',
      agentId: 'test-agent',
    })

    expect(results).toBeDefined()
    expect(results.length).toBeGreaterThan(0)
  })

  it('should sync file', async () => {
    const backend = new ConvexMemoryBackend(mockConfig)
    const result = await backend.syncFile({
      path: 'test.md',
      source: 'memory',
      hash: 'abc123',
      mtime: Date.now(),
      size: 100,
      agentId: 'test-agent',
      chunks: [],
    })

    expect(result.fileId).toBeDefined()
  })
})
```

### Integration Tests

```typescript
// tests/convex-integration.test.ts

describe('Convex Integration', () => {
  it('should end-to-end search', async () => {
    // Setup
    const manager = new ConvexMemoryManager(config)
    await manager.sync()

    // Test
    const results = await manager.search('test query')

    // Verify
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].score).toBeGreaterThan(0.5)
  })

  it('should handle real-time updates', async () => {
    const manager = new ConvexMemoryManager(config)

    // Subscribe to updates
    const subscription = manager.subscribeToUpdates((update) => {
      expect(update).toBeDefined()
    })

    // Trigger sync
    await manager.sync()

    // Cleanup
    subscription.unsubscribe()
  })
})
```

### Performance Tests

```typescript
// tests/convex-performance.test.ts

describe('Convex Performance', () => {
  it('should search within 100ms', async () => {
    const backend = new ConvexMemoryBackend(config)
    const start = Date.now()

    await backend.search({ query: 'test', agentId: 'test-agent' })

    const duration = Date.now() - start
    expect(duration).toBeLessThan(100)
  })

  it('should handle 1000 concurrent searches', async () => {
    const backend = new ConvexMemoryBackend(config)
    const promises = Array.from({ length: 1000 }, () =>
      backend.search({ query: 'test', agentId: 'test-agent' }),
    )

    const results = await Promise.all(promises)
    expect(results.length).toBe(1000)
  })
})
```

### Migration Tests

```typescript
// tests/migration.test.ts

describe('SQLite to Convex Migration', () => {
  it('should migrate all data', async () => {
    const sqliteManager = await getMemorySearchManager({
      cfg: config,
      agentId: 'test-agent',
    })

    const convexBackend = new ConvexMemoryBackend(convexConfig)

    // Migrate
    await migrateData(sqliteManager, convexBackend)

    // Verify
    const sqliteFiles = await sqliteManager.listFiles()
    const convexFiles = await convexBackend.listFiles()

    expect(convexFiles.length).toBe(sqliteFiles.length)
  })

  it('should preserve search results', async () => {
    const sqliteResults = await sqliteManager.search('test query')
    const convexResults = await convexManager.search('test query')

    // Compare results (allow 5% variance)
    compareResults(sqliteResults, convexResults)
  })
})
```

---

## Deployment Plan

### Development Environment

```bash
# Create Convex project
npx convex dev

# Run in dev mode
npm run dev

# Test locally
npx convex dashboard
```

### Staging Environment

```bash
# Create staging project
npx convex dev --team=staging

# Deploy to staging
npx convex deploy --team=staging
```

### Production Environment

```bash
# Deploy to production
npx convex deploy

# Monitor logs
npx convex logs --tail
```

### Monitoring and Alerts

```typescript
// Set up monitoring
export const monitorHealth = query({
  args: {},
  returns: v.object({
    status: v.string(),
    latency: v.number(),
    errorRate: v.number(),
  }),
})

// Set up alerts
const alerts = {
  highLatency: { threshold: 1000, action: 'notify' },
  highErrorRate: { threshold: 0.05, action: 'notify' },
}
```

---

## Rollback Strategy

### Immediate Rollback

```typescript
// Switch back to SQLite
const config = {
  backend: 'sqlite', // Change from "convex"
  // ... other config
}
```

### Data Recovery

```typescript
// Restore from SQLite backup
async function restoreFromBackup(backupPath: string) {
  const sqliteManager = new SQLiteManager(backupPath)
  const data = await sqliteManager.exportData()

  // Restore to Convex
  for (const file of data.files) {
    await convexBackend.syncFile(file)
  }
}
```

### Rollback Procedure

1. **Detect Failure**: Monitor for errors, latency, or data loss
2. **Stop Convex**: Disable Convex writes
3. **Switch Backends**: Change config to use SQLite
4. **Restore Data**: If needed, restore from backup
5. **Verify**: Confirm SQLite is working
6. **Investigate**: Analyze root cause

---

## Timeline and Milestones

### Week 1-2: Setup and Design

- [ ] Create Convex project
- [ ] Design schema
- [ ] Implement basic functions
- [ ] Set up development environment

### Week 3-4: Implementation

- [ ] Implement all Convex functions
- [ ] Create Convex client
- [ ] Implement Convex manager
- [ ] Add real-time subscriptions

### Week 5-6: Testing

- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write performance tests
- [ ] Write migration tests

### Week 7: Migration (Phase 1)

- [ ] Implement dual-write
- [ ] Verify data consistency
- [ ] Monitor performance

### Week 8: Migration (Phase 2)

- [ ] Switch to read-only Convex
- [ ] Verify accuracy
- [ ] Optimize performance

### Week 9: Migration (Phase 3)

- [ ] Switch to Convex-only
- [ ] Maintain SQLite backup
- [ ] Monitor for issues

### Week 10: Stabilization

- [ ] Address any issues
- [ ] Optimize further
- [ ] Document changes

---

## Risk Assessment

### Technical Risks

| Risk                             | Probability | Impact   | Mitigation                               |
| -------------------------------- | ----------- | -------- | ---------------------------------------- |
| Vector search performance issues | Medium      | High     | Thorough testing, tuning HNSW parameters |
| Data loss during migration       | Low         | Critical | Dual-write phase, backups, verification  |
| API compatibility issues         | Low         | Medium   | Comprehensive testing, gradual rollout   |
| Latency increase                 | Medium      | Medium   | Performance optimization, caching        |
| Convex service outage            | Low         | High     | SQLite fallback, graceful degradation    |

### Operational Risks

| Risk                           | Probability | Impact | Mitigation                                |
| ------------------------------ | ----------- | ------ | ----------------------------------------- |
| Team unfamiliarity with Convex | Medium      | Medium | Training, documentation, gradual adoption |
| Extended timeline              | Low         | Medium | Buffer time, parallel tasks               |
| Budget overrun                 | Low         | Medium | Cost monitoring, optimization             |

### Mitigation Strategies

1. **Gradual Migration**: Use dual-write and read-only phases
2. **Backups**: Maintain SQLite backup for 30 days
3. **Monitoring**: Set up alerts for errors and performance
4. **Rollback Plan**: Clear procedure to switch back to SQLite
5. **Testing**: Comprehensive test coverage before migration

---

## Conclusion

This migration plan provides a comprehensive roadmap for transitioning the memory system from SQLite to Convex. The phased approach minimizes risk, ensures data consistency, and allows for gradual adoption.

### Key Benefits

- ✅ Scalability: Automatic scaling with Convex
- ✅ Real-time: Built-in subscriptions for live updates
- ✅ Managed: No database administration required
- ✅ Performance: Optimized vector search
- ✅ Reliability: Automatic backup and recovery

### Next Steps

1. Review and approve this plan
2. Set up Convex project
3. Begin Phase 1 implementation
4. Establish monitoring and alerts
5. Start migration timeline

For questions or concerns, contact the engineering team.
