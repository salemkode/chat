import fs from 'node:fs/promises'
import path from 'node:path'
import { hashText, chunkMarkdown } from './internal.js'
import {
  createEmbeddingProvider,
  type EmbeddingProvider,
} from './embeddings.js'
import { ConvexMemoryBackend } from './convex-backend.js'

export interface ConvexManagerConfig {
  deploymentUrl: string
  agentId: string
  workspaceDir: string
  provider: 'openai' | 'gemini' | 'local'
  model: string
  chunking: { tokens: number; overlap: number }
  providerKey: string
}

export interface MemorySearchResult {
  id: string
  path: string
  startLine: number
  endLine: number
  score: number
  snippet: string
  source: 'memory' | 'sessions'
}

export class ConvexMemoryManager {
  private backend: ConvexMemoryBackend
  private provider: EmbeddingProvider | null = null
  private config: ConvexManagerConfig
  private providerKey: string

  constructor(config: ConvexManagerConfig) {
    this.config = config
    this.backend = new ConvexMemoryBackend({
      deploymentUrl: config.deploymentUrl,
    })
    this.providerKey = config.providerKey
  }

  async initialize(): Promise<void> {
    const result = await createEmbeddingProvider({
      provider: this.config.provider,
      model: this.config.model,
      config: {} as any,
      fallback: 'none',
    })
    this.provider = result.provider
  }

  async search(
    query: string,
    opts?: {
      maxResults?: number
      minScore?: number
      sessionKey?: string
    },
  ): Promise<MemorySearchResult[]> {
    if (!this.provider) {
      throw new Error('Manager not initialized. Call initialize() first.')
    }

    const queryEmbedding = await this.provider.embedQuery(query)

    const results = await this.backend.searchChunks({
      embedding: queryEmbedding,
      agentId: this.config.agentId,
      maxResults: opts?.maxResults || 10,
      minScore: opts?.minScore || 0.5,
    })

    return results
  }

  async sync(): Promise<void> {
    await this.backend.updateSyncStatus({
      agentId: this.config.agentId,
      dirty: false,
    })

    const memoryFiles = await this.listMemoryFiles()

    for (const file of memoryFiles) {
      await this.syncFile(file, 'memory')
    }

    const sessionFiles = await this.listSessionFiles()

    for (const file of sessionFiles) {
      await this.syncFile(file, 'sessions')
    }

    await this.backend.updateSyncStatus({
      agentId: this.config.agentId,
      lastFullSync: Date.now(),
      dirty: false,
    })
  }

  private async syncFile(
    absPath: string,
    source: 'memory' | 'sessions',
  ): Promise<void> {
    if (!this.provider) {
      throw new Error('Manager not initialized. Call initialize() first.')
    }

    const stat = await fs.stat(absPath)
    const content = await fs.readFile(absPath, 'utf-8')
    const hash = hashText(content)
    const relPath = path.relative(this.config.workspaceDir, absPath)

    const existingFile = await this.backend.getFile({
      path: relPath,
      agentId: this.config.agentId,
    })

    if (existingFile && existingFile.hash === hash) {
      return
    }

    const chunks = await this.chunkAndEmbed(content)

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

  private async chunkAndEmbed(content: string): Promise<
    Array<{
      startLine: number
      endLine: number
      hash: string
      text: string
      embedding: number[]
    }>
  > {
    if (!this.provider) {
      throw new Error('Manager not initialized. Call initialize() first.')
    }

    const chunks = chunkMarkdown(content, this.config.chunking)
    const texts = chunks.map((c) => c.text)

    const embeddings: number[][] = []
    for (let i = 0; i < texts.length; i++) {
      const hash = chunks[i].hash
      const cached = await this.backend.getCachedEmbedding({
        provider: this.provider.id,
        model: this.provider.model,
        providerKey: this.providerKey,
        hash,
      })

      if (cached) {
        embeddings.push(cached.embedding)
      } else {
        const embedding = await this.provider.embedQuery(texts[i])
        embeddings.push(embedding)

        await this.backend.cacheEmbedding({
          provider: this.provider.id,
          model: this.provider.model,
          providerKey: this.providerKey,
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

  private async listMemoryFiles(): Promise<string[]> {
    const files: string[] = []

    const memoryFile = path.join(this.config.workspaceDir, 'MEMORY.md')
    try {
      await fs.access(memoryFile)
      files.push(memoryFile)
    } catch {}

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

  private async listSessionFiles(): Promise<string[]> {
    return []
  }

  async status(): Promise<{
    files: number
    chunks: number
    dirty: boolean
    workspaceDir: string
    provider: string
    model: string
  }> {
    const files = await this.backend.listFiles({
      agentId: this.config.agentId,
    })

    return {
      files: files.length,
      chunks: 0,
      dirty: false,
      workspaceDir: this.config.workspaceDir,
      provider: this.provider?.id || 'unknown',
      model: this.provider?.model || 'unknown',
    }
  }

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

  async close(): Promise<void> {}
}
