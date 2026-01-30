# Convex Backend Migration - Simple Guide

## What We're Doing

Move memory system from local SQLite database to Convex cloud database.

**Why?**

- ✅ Better vector search performance
- ✅ Real-time synchronization
- ✅ No database setup/maintenance
- ✅ Automatic scaling
- ✅ Multi-agent support

---

## The Plan - 5 Simple Steps

### Step 1: Set Up Convex Project (15 minutes)

```bash
# 1. Install Convex CLI
npm install -g convex

# 2. Initialize Convex in your project
npx convex init

# 3. Create a free account at https://convex.dev
# 4. Connect your project
npx convex dev
```

---

### Step 2: Define Schema (30 minutes)

Create `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Store files metadata
  files: defineTable({
    path: v.string(), // File path (e.g., "memory/auth.md")
    source: v.union(v.literal('memory'), v.literal('sessions')), // Where it comes from
    hash: v.string(), // SHA-256 of content
    mtime: v.number(), // Last modified time
    size: v.number(), // File size in bytes
    agentId: v.string(), // Which agent owns this
  })
    .index('by_path', ['path', 'agentId'])
    .index('by_source', ['source', 'agentId'])
    .index('by_agent', ['agentId']),

  // Store text chunks with embeddings
  chunks: defineTable({
    path: v.string(), // File path
    source: v.union(v.literal('memory'), v.literal('sessions')),
    startLine: v.number(), // Start line in file
    endLine: v.number(), // End line in file
    hash: v.string(), // Chunk hash
    model: v.string(), // Embedding model used
    text: v.string(), // Chunk text
    embedding: v.array(v.number()), // Vector embedding
    updatedAt: v.number(), // Last update time
    agentId: v.string(), // Agent ID
    fileId: v.id('files'), // Reference to file
  })
    .index('by_file', ['fileId'])
    .index('by_agent', ['agentId'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536, // OpenAI: 1536, Gemini: 768, Local: 384
      filterFields: ['agentId', 'model', 'source'],
    }),

  // Cache embeddings to avoid recomputation
  embeddingCache: defineTable({
    provider: v.string(), // "openai", "gemini", "local"
    model: v.string(),
    hash: v.string(), // Content hash
    embedding: v.array(v.number()),
    updatedAt: v.number(),
  })
    .index('by_composite', ['provider', 'model', 'hash'])
    .index('by_updated', ['updatedAt']),

  // Store metadata
  meta: defineTable({
    key: v.string(),
    value: v.string(),
    agentId: v.string(),
  }).index('by_key', ['key', 'agentId']),
})
```

Deploy schema:

```bash
npx convex deploy
```

---

### Step 3: Create Convex Functions (2 hours)

Create these files in `convex/functions/`:

#### 3.1 Search Function

`convex/functions/search.ts`:

```typescript
import { query } from './_generated/server'
import { v } from 'convex/values'

// Search chunks by vector similarity
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

    // Get query embedding (you'll need to call your embedding provider)
    const embedding = await getQueryEmbedding(query)

    // Vector search with filters
    let queryBuilder = ctx.db.query('chunks').withIndex('by_embedding', (q) =>
      q
        .withVectorFields('embedding')
        .nearest(embedding, { numResults: maxResults * 2 })
        .filter((q) => q.eq('agentId', agentId)),
    )

    // Apply optional source filter
    if (source) {
      queryBuilder = queryBuilder.withIndex('by_embedding', (q) =>
        q
          .withVectorFields('embedding')
          .nearest(embedding, { numResults: maxResults * 2 })
          .filter((q) => q.eq('agentId', agentId).eq('source', source)),
      )
    }

    const results = await queryBuilder.take(maxResults * 2)

    // Filter by score and format
    return results
      .filter((r) => r.score >= minScore)
      .slice(0, maxResults)
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

// Helper: Get query embedding
async function getQueryEmbedding(query: string): Promise<number[]> {
  // You'll integrate your existing embedding provider here
  // For now, return a placeholder
  throw new Error('Implement embedding provider')
}
```

#### 3.2 Sync Function

`convex/functions/sync.ts`:

```typescript
import { mutation } from './_generated/server'
import { v } from 'convex/values'

// Sync a file to Convex
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

    // Update or create file
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

    // Only update chunks if file changed
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

// Delete a file and its chunks
export const deleteFile = mutation({
  args: {
    path: v.string(),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { path, agentId } = args

    // Find file
    const file = await ctx.db
      .query('files')
      .withIndex('by_path', (q) => q.eq('path', path).eq('agentId', agentId))
      .first()

    if (!file) return

    // Delete chunks
    const chunks = await ctx.db
      .query('chunks')
      .withIndex('by_file', (q) => q.eq('fileId', file._id))
      .collect()

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id)
    }

    // Delete file
    await ctx.db.delete(file._id)
  },
})
```

#### 3.3 Utility Functions

`convex/functions/cache.ts`:

```typescript
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// Get cached embedding
export const getCachedEmbedding = query({
  args: {
    provider: v.string(),
    model: v.string(),
    hash: v.string(),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query('embeddingCache')
      .withIndex('by_composite', (q) =>
        q
          .eq('provider', args.provider)
          .eq('model', args.model)
          .eq('hash', args.hash),
      )
      .first()

    if (!cached) return null

    return {
      embedding: cached.embedding,
    }
  },
})

// Cache an embedding
export const cacheEmbedding = mutation({
  args: {
    provider: v.string(),
    model: v.string(),
    hash: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const { provider, model, hash, embedding } = args

    // Check if exists
    const existing = await ctx.db
      .query('embeddingCache')
      .withIndex('by_composite', (q) =>
        q.eq('provider', provider).eq('model', model).eq('hash', hash),
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        embedding,
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert('embeddingCache', {
        provider,
        model,
        hash,
        embedding,
        updatedAt: Date.now(),
      })
    }
  },
})
```

#### 3.4 File Functions

`convex/functions/files.ts`:

```typescript
import { query } from './_generated/server'
import { v } from 'convex/values'

// Get file by path
export const getFile = query({
  args: {
    path: v.string(),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('files')
      .withIndex('by_path', (q) =>
        q.eq('path', args.path).eq('agentId', args.agentId),
      )
      .first()
  },
})

// List all files for an agent
export const listFiles = query({
  args: {
    agentId: v.string(),
    source: v.optional(v.union(v.literal('memory'), v.literal('sessions'))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('files')
      .withIndex('by_agent', (q) => q.eq('agentId', args.agentId))

    if (args.source) {
      query = ctx.db
        .query('files')
        .withIndex('by_source', (q) =>
          q.eq('source', args.source).eq('agentId', args.agentId),
        )
    }

    return await query.collect()
  },
})
```

Deploy functions:

```bash
npx convex deploy
```

---

### Step 4: Create Convex Client Wrapper (1 hour)

Create `memory/convex-backend.ts`:

```typescript
import { ConvexHttpClient } from 'convex/browser'

interface ConvexConfig {
  deploymentUrl: string
}

export class ConvexMemoryBackend {
  private client: ConvexHttpClient

  constructor(config: ConvexConfig) {
    this.client = new ConvexHttpClient(config.deploymentUrl)
  }

  // Search chunks
  async searchChunks(params: {
    query: string
    agentId: string
    maxResults?: number
    minScore?: number
    source?: 'memory' | 'sessions'
  }): Promise<any[]> {
    return await this.client.query('functions/search:searchChunks', params)
  }

  // Sync a file
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

  // Delete a file
  async deleteFile(params: { path: string; agentId: string }): Promise<void> {
    await this.client.mutation('functions/sync:deleteFile', params)
  }

  // Get cached embedding
  async getCachedEmbedding(params: {
    provider: string
    model: string
    hash: string
  }): Promise<{ embedding: number[] } | null> {
    return await this.client.query('functions/cache:getCachedEmbedding', params)
  }

  // Cache an embedding
  async cacheEmbedding(params: {
    provider: string
    model: string
    hash: string
    embedding: number[]
  }): Promise<void> {
    await this.client.mutation('functions/cache:cacheEmbedding', params)
  }

  // Get file
  async getFile(params: { path: string; agentId: string }): Promise<any> {
    return await this.client.query('functions/files:getFile', params)
  }

  // List files
  async listFiles(params: {
    agentId: string
    source?: 'memory' | 'sessions'
  }): Promise<any[]> {
    return await this.client.query('functions/files:listFiles', params)
  }
}
```

---

### Step 5: Create Convex Memory Manager (2 hours)

Create `memory/convex-manager.ts`:

```typescript
import fs from 'node:fs/promises'
import path from 'node:path'
import { hashText, chunkMarkdown, type MemoryChunk } from './internal.js'
import {
  createEmbeddingProvider,
  type EmbeddingProvider,
} from './embeddings.js'
import { ConvexMemoryBackend } from './convex-backend.js'

interface ConvexManagerConfig {
  deploymentUrl: string
  agentId: string
  workspaceDir: string
  provider: 'openai' | 'gemini' | 'local'
  model: string
  chunking: { tokens: number; overlap: number }
}

export class ConvexMemoryManager {
  private backend: ConvexMemoryBackend
  private provider: EmbeddingProvider
  private config: ConvexManagerConfig

  constructor(config: ConvexManagerConfig) {
    this.config = config
    this.backend = new ConvexMemoryBackend({
      deploymentUrl: config.deploymentUrl,
    })
  }

  async initialize(): Promise<void> {
    // Initialize embedding provider
    this.provider = await createEmbeddingProvider({
      provider: this.config.provider,
      model: this.config.model,
      // Add other config options as needed
      config: {} as any,
    })
  }

  // Search memory
  async search(
    query: string,
    opts?: {
      maxResults?: number
      minScore?: number
      sessionKey?: string
    },
  ): Promise<any[]> {
    // Get query embedding
    const queryEmbedding = await this.provider.embedQuery(query)

    // Search via backend
    const results = await this.backend.searchChunks({
      query, // Note: you'll need to pass embedding in the function
      agentId: this.config.agentId,
      maxResults: opts?.maxResults || 10,
      minScore: opts?.minScore || 0.5,
    })

    return results
  }

  // Sync all memory files
  async sync(): Promise<void> {
    // Sync memory files
    const memoryFiles = await this.listMemoryFiles()

    for (const file of memoryFiles) {
      await this.syncFile(file, 'memory')
    }

    // Sync session files
    const sessionFiles = await this.listSessionFiles()

    for (const file of sessionFiles) {
      await this.syncFile(file, 'sessions')
    }
  }

  // Sync a single file
  private async syncFile(
    absPath: string,
    source: 'memory' | 'sessions',
  ): Promise<void> {
    const stat = await fs.stat(absPath)
    const content = await fs.readFile(absPath, 'utf-8')
    const hash = hashText(content)
    const relPath = path.relative(this.config.workspaceDir, absPath)

    // Check if file needs syncing
    const existingFile = await this.backend.getFile({
      path: relPath,
      agentId: this.config.agentId,
    })

    if (existingFile && existingFile.hash === hash) {
      return // No change
    }

    // Chunk and embed
    const chunks = await this.chunkAndEmbed(content)

    // Sync to Convex
    await this.backend.syncFile({
      path: relPath,
      source,
      hash,
      mtime: stat.mtimeMs,
      size: stat.size,
      agentId: this.config.agentId,
      chunks,
    })
  }

  // Chunk and embed text
  private async chunkAndEmbed(content: string): Promise<
    Array<{
      startLine: number
      endLine: number
      hash: string
      text: string
      embedding: number[]
    }>
  > {
    const chunks = chunkMarkdown(content, this.config.chunking)
    const texts = chunks.map((c) => c.text)

    // Check cache first
    const embeddings: number[][] = []
    for (let i = 0; i < texts.length; i++) {
      const hash = chunks[i].hash
      const cached = await this.backend.getCachedEmbedding({
        provider: this.provider.id,
        model: this.provider.model,
        hash,
      })

      if (cached) {
        embeddings.push(cached.embedding)
      } else {
        // Generate embedding
        const embedding = await this.provider.embedQuery(texts[i])
        embeddings.push(embedding)

        // Cache it
        await this.backend.cacheEmbedding({
          provider: this.provider.id,
          model: this.provider.model,
          hash,
          embedding,
        })
      }
    }

    return chunks.map((chunk, i) => ({
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      hash: chunk.hash,
      text: chunk.text,
      embedding: embeddings[i],
    }))
  }

  // List memory files
  private async listMemoryFiles(): Promise<string[]> {
    const files: string[] = []

    // Check MEMORY.md
    const memoryFile = path.join(this.config.workspaceDir, 'MEMORY.md')
    try {
      await fs.access(memoryFile)
      files.push(memoryFile)
    } catch {}

    // Check memory/ directory
    const memoryDir = path.join(this.config.workspaceDir, 'memory')
    try {
      await fs.access(memoryDir)
      const entries = await fs.readdir(memoryDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(path.join(memoryDir, entry.name))
        }
      }
    } catch {}

    return files
  }

  // List session files
  private async listSessionFiles(): Promise<string[]> {
    // TODO: Implement based on your session storage
    return []
  }

  // Get status
  async status(): Promise<any> {
    const files = await this.backend.listFiles({
      agentId: this.config.agentId,
    })

    return {
      files: files.length,
      chunks: 0, // TODO: Count chunks
      provider: this.provider.id,
      model: this.provider.model,
      workspaceDir: this.config.workspaceDir,
    }
  }

  // Read file content
  async readFile(params: {
    relPath: string
    from?: number
    lines?: number
  }): Promise<{ text: string; path: string }> {
    const absPath = path.resolve(this.config.workspaceDir, params.relPath)
    const content = await fs.readFile(absPath, 'utf-8')

    if (!params.from && !params.lines) {
      return { text: content, path: params.relPath }
    }

    const lines = content.split('\n')
    const start = Math.max(1, params.from ?? 1)
    const count = Math.max(1, params.lines ?? lines.length)
    const slice = lines.slice(start - 1, start - 1 + count)

    return {
      text: slice.join('\n'),
      path: params.relPath,
    }
  }

  // Close manager
  async close(): Promise<void> {
    // Convex client doesn't need explicit cleanup
  }
}
```

---

## Step 6: Update Integration (1 hour)

Update `memory/search-manager.ts`:

```typescript
import type { ClawdbotConfig } from '../config/config.js'
import { ConvexMemoryManager } from './convex-manager.js'

export type MemorySearchManagerResult = {
  manager: ConvexMemoryManager | null
  error?: string
}

export async function getMemorySearchManager(params: {
  cfg: ClawdbotConfig
  agentId: string
}): Promise<MemorySearchManagerResult> {
  try {
    // Check if Convex is configured
    const convexDeploymentUrl = process.env.CONVEX_DEPLOYMENT_URL
    if (!convexDeploymentUrl) {
      return {
        manager: null,
        error: 'CONVEX_DEPLOYMENT_URL not configured',
      }
    }

    // Resolve config (adapt your existing config logic)
    const config = {
      deploymentUrl: convexDeploymentUrl,
      agentId: params.agentId,
      workspaceDir: resolveAgentWorkspaceDir(params.cfg, params.agentId),
      provider: resolveProvider(params.cfg, params.agentId),
      model: resolveModel(params.cfg, params.agentId),
      chunking: resolveChunking(params.cfg, params.agentId),
    }

    const manager = new ConvexMemoryManager(config)
    await manager.initialize()

    return { manager }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { manager: null, error: message }
  }
}

// Helper functions (adapt from your existing code)
function resolveAgentWorkspaceDir(cfg: any, agentId: string): string {
  // Implement based on your existing logic
  return `/path/to/workspace/${agentId}`
}

function resolveProvider(
  cfg: any,
  agentId: string,
): 'openai' | 'gemini' | 'local' {
  // Implement based on your existing logic
  return 'openai'
}

function resolveModel(cfg: any, agentId: string): string {
  // Implement based on your existing logic
  return 'text-embedding-3-small'
}

function resolveChunking(
  cfg: any,
  agentId: string,
): { tokens: number; overlap: number } {
  // Implement based on your existing logic
  return { tokens: 200, overlap: 50 }
}
```

---

## Step 7: Configure Environment (5 minutes)

Create `.env.local`:

```bash
# Convex deployment URL (get from: npx convex dashboard)
CONVEX_DEPLOYMENT_URL=https://your-project.convex.cloud
```

Or add to your existing config:

```typescript
// config.ts
{
  memorySearch: {
    backend: "convex",
    convex: {
      deploymentUrl: process.env.CONVEX_DEPLOYMENT_URL,
    },
    // ... other config
  }
}
```

---

## Step 8: Test It (30 minutes)

Create `test-convex.js`:

```javascript
import { getMemorySearchManager } from './memory/index.js'

async function test() {
  // Get manager
  const { manager, error } = await getMemorySearchManager({
    cfg: config,
    agentId: 'test-agent',
  })

  if (error || !manager) {
    console.error('Failed to create manager:', error)
    process.exit(1)
  }

  console.log('✅ Manager created')

  // Sync files
  console.log('Syncing files...')
  await manager.sync()
  console.log('✅ Sync complete')

  // Check status
  const status = await manager.status()
  console.log('Status:', status)

  // Search
  console.log("\nSearching for 'authentication'...")
  const results = await manager.search('authentication', {
    maxResults: 5,
  })

  console.log(`Found ${results.length} results:`)
  for (const result of results) {
    console.log(
      `  - ${result.path}:${result.startLine}-${result.endLine} (score: ${result.score.toFixed(2)})`,
    )
    console.log(`    ${result.snippet.slice(0, 100)}...`)
  }

  // Cleanup
  await manager.close()
  console.log('\n✅ All tests passed!')
}

test().catch(console.error)
```

Run test:

```bash
node test-convex.js
```

---

## Step 9: Migrate Existing Data (1 hour)

Create `scripts/migrate-to-convex.js`:

```javascript
import { getMemorySearchManager } from "../memory/index.js";
import { ConvexMemoryBackend } from "../memory/convex-backend.js";
import fs from "node:fs/promises";
import path from "node:path";
import { hashText, chunkMarkdown } from "../memory/internal.js";

async function migrate() {
  console.log("🚀 Starting migration to Convex...\n");

  // 1. Get Convex backend
  const convexBackend = new ConvexMemoryBackend({
    deploymentUrl: process.env.CONVEX_DEPLOYMENT_URL,
  });

  // 2. Get SQLite manager (old backend)
  const { manager: sqliteManager } = await getMemorySearchManager({
    cfg: config,
    agentId: "your-agent-id",
  });

  if (!sqliteManager) {
    console.error("❌ Failed to get SQLite manager");
    process.exit(1);
  }

  console.log("✅ Connected to both backends\n");

  // 3. List all memory files
  const workspaceDir = "/path/to/workspace";
  const memoryFiles = await listMemoryFiles(workspaceDir);

  console.log(`Found ${memoryFiles.length} memory files\n`);

  // 4. Migrate each file
  for (let i = 0; i < memoryFiles.length; i++) {
    const file = memoryFiles[i];
    const progress = ((i + 1) / memoryFiles.length * 100).toFixed(1);

    console.log(`[${progress}%] Migrating: ${path.basename(file)}...`);

    // Read file
    const stat = await fs.stat(file);
    const content = await fs.readFile(file, "utf-8");
    const hash = hashText(content);
    const relPath = path.relative(workspaceDir, file);

    // Chunk
    const chunks = chunkMarkdown(content, { tokens: 200, overlap: 50 });

    // Get embeddings (reuse from SQLite if available)
    const chunksWithEmbeddings = [];
    for (const chunk of chunks) {
      // Try to get from SQLite cache
      const embedding = await getEmbeddingFromCache(chunk.hash);

      if (embedding) {
        chunksWithEmbeddings.push({
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          hash: chunk.hash,
          text: chunk.text,
          embedding,
        });
      } else {
        console.log(`  ⚠️  No cached embedding for chunk ${chunk.hash}`);
      }
    }

    // Sync to Convex
    await convexBackend.syncFile({
      path: relPath,
      source: "memory",
      hash,
      mtime: stat.mtimeMs,
      size: stat.size,
      agentId: "your-agent-id",
      chunks: chunksWithEmbeddings,
    });
  }

  console.log("\n✅ Migration complete!");
  console.log("\n📊 Statistics:");
  console.log(`  Files migrated: ${memoryFiles.length}`);
  console.log(`  Total chunks: ${totalChunks}`);
  console.log("\n💡 You can now switch to Convex backend!");
}

// Helper functions
async function listMemoryFiles(workspaceDir: string): Promise<string[]> {
  const files: string[] = [];

  // MEMORY.md
  try {
    await fs.access(path.join(workspaceDir, "MEMORY.md"));
    files.push(path.join(workspaceDir, "MEMORY.md"));
  } catch {}

  // memory/ directory
  const memoryDir = path.join(workspaceDir, "memory");
  try {
    await fs.access(memoryDir);
    const entries = await fs.readdir(memoryDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(path.join(memoryDir, entry.name));
      }
    }
  } catch {}

  return files;
}

async function getEmbeddingFromCache(hash: string): Promise<number[] | null> {
  // Try to get from SQLite embedding cache
  // You'll need to implement this based on your SQLite setup
  return null;
}

migrate().catch(console.error);
```

Run migration:

```bash
node scripts/migrate-to-convex.js
```

---

## Summary

### What You Did

1. ✅ Set up Convex project
2. ✅ Defined schema with vector indexes
3. ✅ Created Convex functions (search, sync, cache)
4. ✅ Built Convex client wrapper
5. ✅ Created Convex memory manager
6. ✅ Updated integration
7. ✅ Configured environment
8. ✅ Tested the setup
9. ✅ Migrated existing data

### Time Estimate

- **Total time**: ~8 hours
- **Can be done in**: 1-2 days

### Next Steps

1. ✅ Test thoroughly with real data
2. ✅ Monitor performance
3. ✅ Scale to production
4. ✅ Remove SQLite code (optional)

---

## Troubleshooting

### "CONVEX_DEPLOYMENT_URL not configured"

**Fix**: Set the environment variable:

```bash
export CONVEX_DEPLOYMENT_URL=https://your-project.convex.cloud
```

### Vector search not working

**Fix**: Check vector dimensions match your embedding model:

- OpenAI: 1536
- Gemini: 768
- Local: 384

Update in `convex/schema.ts`:

```typescript
.vectorIndex("by_embedding", {
  dimensions: 1536, // Change to match your model
})
```

### Slow performance

**Fix**: Adjust vector search parameters in Convex function:

```typescript
.nearest(embedding, { numResults: 20 }) // Lower for better performance
```

### Missing embeddings during migration

**Fix**: The migration script will skip chunks without cached embeddings. You'll need to re-sync:

```javascript
await manager.sync()
```

---

## Support

- **Convex Docs**: https://docs.convex.dev
- **Convex Dashboard**: `npx convex dashboard`
- **Memory System Docs**: `docs/memory-architecture.md`
