/* eslint-disable */
// @ts-nocheck

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

export interface ConvexConfig {
  deploymentUrl: string
}

export class ConvexMemoryBackend {
  private client: ConvexHttpClient

  constructor(config: ConvexConfig) {
    this.client = new ConvexHttpClient(config.deploymentUrl)
  }

  async searchChunks(params: {
    embedding: number[]
    agentId: string
    maxResults?: number
    minScore?: number
    source?: 'memory' | 'sessions'
  }) {
    return await this.client.query(api.memorySearch.searchChunks, params)
  }

  async searchFiles(params: {
    agentId: string
    source?: 'memory' | 'sessions'
    pathPattern?: string
  }): Promise<any[]> {
    return await this.client.query(api.memorySearch.searchFiles, params)
  }

  syncFile(params: {
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
    return this.client.mutation(api.memorySync.syncFile, params)
  }

  async deleteFile(params: { path: string; agentId: string }): Promise<void> {
    return await this.client.mutation(api.memorySync.deleteFile, params)
  }

  async getFile(params: { path: string; agentId: string }): Promise<any> {
    return await this.client.query(api.memorySync.getFile, params)
  }

  async listFiles(params: {
    agentId: string
    source?: 'memory' | 'sessions'
  }): Promise<any[]> {
    return await this.client.query(api.memorySync.listFiles, params)
  }

  async getCachedEmbedding(params: {
    provider: string
    model: string
    providerKey: string
    hash: string
  }): Promise<{ embedding: number[]; dims?: number } | null> {
    return await this.client.query(api.memoryCache.getCachedEmbedding, params)
  }

  async cacheEmbedding(params: {
    provider: string
    model: string
    providerKey: string
    hash: string
    embedding: number[]
    dims?: number
  }): Promise<void> {
    return await this.client.mutation(api.memoryCache.cacheEmbedding, params)
  }

  async pruneOldCache(params?: {
    maxEntries?: number
  }): Promise<{ deleted: number }> {
    return await this.client.mutation(
      api.memoryCache.pruneOldCache,
      params ?? {},
    )
  }

  async getCacheStats(): Promise<{ count: number }> {
    return await this.client.query(api.memoryCache.getCacheStats)
  }

  async getSyncStatus(params: {
    agentId: string
  }): Promise<{
    lastFullSync: number
    pendingFiles: string[]
    dirty: boolean
    error?: string
  }> {
    return await this.client.query(api.memorySync.getSyncStatus, params)
  }

  async updateSyncStatus(params: {
    agentId: string
    lastFullSync?: number
    pendingFiles?: string[]
    dirty?: boolean
    error?: string
  }): Promise<void> {
    return await this.client.mutation(api.memorySync.updateSyncStatus, params)
  }
}
