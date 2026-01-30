# Convex Memory Backend - Implementation Complete

## What Was Implemented

✅ **Convex Schema** - Added memory system tables to existing schema
✅ **Convex Functions** - Search, sync, cache functions
✅ **Convex Client Wrapper** - TypeScript client for backend
✅ **Convex Memory Manager** - Main manager class
✅ **Updated Search Manager** - Supports Convex backend
✅ **Test Script** - Verify implementation
✅ **Environment Template** - Configuration example

## File Structure

```
convex/
├── schema.ts                    # ✅ Updated with memory tables
└── functions/
    ├── memorySearch.ts          # ✅ Search functions
    ├── memorySync.ts            # ✅ Sync functions
    └── memoryCache.ts           # ✅ Cache functions

memory/
├── convex-backend.ts            # ✅ Client wrapper
├── convex-manager.ts           # ✅ Memory manager
└── search-manager.ts           # ✅ Updated integration

scripts/
└── test-convex-memory.ts      # ✅ Test script

.env.convex.example              # ✅ Configuration template
```

## Quick Start

### 1. Set Environment

```bash
# Copy example
cp .env.convex.example .env.local

# Edit and add your Convex deployment URL
# Get from: npx convex dashboard
```

### 2. Deploy Schema and Functions

```bash
# Deploy to Convex
npx convex deploy

# Or run in dev mode
npx convex dev
```

### 3. Test Implementation

```bash
# Run test script
npx tsx scripts/test-convex-memory.ts
```

### 4. Use in Code

```typescript
import { getMemorySearchManager } from './memory/index.js'

// Get manager (automatically uses Convex if CONVEX_DEPLOYMENT_URL is set)
const { manager } = await getMemorySearchManager({
  cfg: config,
  agentId: 'your-agent-id',
})

// Search memory
const results = await manager.search('authentication flow', {
  maxResults: 10,
})

// Sync files
await manager.sync()

// Get status
const status = await manager.status()
console.log(status)
```

## Configuration

### Required Environment Variables

```bash
# Convex deployment URL
CONVEX_DEPLOYMENT_URL=https://your-project.convex.cloud
```

### Optional Environment Variables

```bash
# Force SQLite backend
CONVEX_DISABLED=true

# Embedding provider
EMBEDDING_PROVIDER=openai  # or gemini, local, auto

# Embedding model
EMBEDDING_MODEL=text-embedding-3-small

# API keys
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```

## API Reference

### ConvexMemoryManager

```typescript
class ConvexMemoryManager {
  // Initialize manager
  async initialize(): Promise<void>

  // Search memory
  async search(
    query: string,
    opts?: {
      maxResults?: number
      minScore?: number
      sessionKey?: string
    },
  ): Promise<MemorySearchResult[]>

  // Sync all files
  async sync(): Promise<void>

  // Get status
  async status(): Promise<{
    files: number
    chunks: number
    dirty: boolean
    workspaceDir: string
    provider: string
    model: string
  }>

  // Read file
  async readFile(params: {
    relPath: string
    from?: number
    lines?: number
  }): Promise<{ text: string; path: string }>

  // Close manager
  async close(): Promise<void>
}
```

### MemorySearchResult

```typescript
interface MemorySearchResult {
  id: string // Chunk ID
  path: string // File path
  startLine: number // Start line
  endLine: number // End line
  score: number // Similarity score (0-1)
  snippet: string // Text snippet
  source: 'memory' | 'sessions'
}
```

## Convex Functions

### Search Functions

- `memorySearch.searchChunks` - Vector similarity search
- `memorySearch.searchFiles` - File metadata search

### Sync Functions

- `memorySync.syncFile` - Sync a file
- `memorySync.deleteFile` - Delete a file
- `memorySync.getFile` - Get file metadata
- `memorySync.listFiles` - List files
- `memorySync.getSyncStatus` - Get sync state
- `memorySync.updateSyncStatus` - Update sync state

### Cache Functions

- `memoryCache.getCachedEmbedding` - Get cached embedding
- `memoryCache.cacheEmbedding` - Cache an embedding
- `memoryCache.pruneOldCache` - Prune old cache entries
- `memoryCache.getCacheStats` - Get cache statistics

## Backend Selection

The system automatically selects the backend:

1. **Convex** (if `CONVEX_DEPLOYMENT_URL` is set)
2. **SQLite** (if `CONVEX_DEPLOYMENT_URL` is not set)

You can force SQLite:

```typescript
const { manager } = await getMemorySearchManager({
  cfg: config,
  agentId: 'your-agent-id',
  useConvex: false, // Force SQLite
})
```

## Data Migration

To migrate existing SQLite data to Convex:

```typescript
// 1. Get SQLite manager
const { manager: sqliteManager } = await getMemorySearchManager({
  cfg: config,
  agentId: 'your-agent-id',
  useConvex: false,
})

// 2. Get files and content
const files = await sqliteManager.listFiles()
for (const file of files) {
  const { text } = await sqliteManager.readFile({ relPath: file.path })
  // 3. Process and sync to Convex
}

// 4. Use Convex manager going forward
const { manager: convexManager } = await getMemorySearchManager({
  cfg: config,
  agentId: 'your-agent-id',
})
```

## Testing

### Run Tests

```bash
# Test Convex backend
npx tsx scripts/test-convex-memory.ts

# Test search
node -e "
import('./memory/index.js').then(async ({ getMemorySearchManager }) => {
  const { manager } = await getMemorySearchManager({ cfg: {}, agentId: 'test' });
  const results = await manager.search('test');
  console.log('Results:', results);
});
"
```

### Expected Output

```
🧪 Testing Convex Memory Backend...

✅ Manager created successfully

📊 Getting status...
Status: {
  "files": 0,
  "chunks": 0,
  "dirty": false,
  "workspaceDir": "/path/to/workspace/test-agent",
  "provider": "openai",
  "model": "text-embedding-3-small"
}

🔄 Syncing files...
✅ Sync complete

🔍 Searching for test query...
✅ Found X results:
  - path/to/file.md:10-20 (score: 0.85)
    snippet text...

✅ All tests passed!
```

## Troubleshooting

### "CONVEX_DEPLOYMENT_URL not configured"

**Fix**: Set environment variable:

```bash
export CONVEX_DEPLOYMENT_URL=https://your-project.convex.cloud
```

### Vector search performance

**Current**: Manual cosine similarity (CPU-based)

**To improve**: Upgrade to native Convex vector search when available:

```typescript
// In convex/functions/memorySearch.ts
// Replace manual calculation with:
.nearest(embedding, { numResults: maxResults })
```

### Missing embeddings

**Symptom**: Chunks without embeddings

**Fix**: Re-sync files:

```typescript
await manager.sync()
```

### Type errors

**Fix**: Regenerate Convex types:

```bash
npx convex dev --once
```

## Next Steps

1. ✅ Test with real data
2. ✅ Migrate existing SQLite data
3. ✅ Update vector dimensions for your embedding model
4. ✅ Add session file syncing
5. ✅ Implement real-time subscriptions
6. ✅ Monitor performance in production
7. ✅ Remove SQLite code (after migration verified)

## Performance Considerations

### Current Implementation

- **Search**: Manual cosine similarity (CPU)
- **Caching**: Full embedding cache
- **Batching**: No batching (sequential)
- **Concurrent**: No concurrent operations

### Optimizations

1. **Vector Search**: Use native Convex vector search (when available)
2. **Batch Embeddings**: Process multiple texts at once
3. **Concurrent Sync**: Process files in parallel
4. **Incremental Sync**: Only sync changed files

## Support

- **Convex Docs**: https://docs.convex.dev
- **Convex Dashboard**: `npx convex dashboard`
- **Memory Architecture**: `docs/memory-architecture.md`
- **Usage Guide**: `docs/memory-usage-guide.md`
