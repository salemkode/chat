import { mutation, query } from '../_generated/server'
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

    const existingFile = await ctx.db
      .query('memoryFiles')
      .withIndex('by_path', (q) => q.eq('path', path).eq('agentId', agentId))
      .first()

    const fileId =
      existingFile?._id ||
      (await ctx.db.insert('memoryFiles', {
        path,
        source,
        hash,
        mtime,
        size,
        agentId,
      }))

    if (!existingFile || existingFile.hash !== hash) {
      if (existingFile) {
        const oldChunks = await ctx.db
          .query('memoryChunks')
          .withIndex('by_file', (q) => q.eq('fileId', fileId))
          .collect()

        for (const chunk of oldChunks) {
          await ctx.db.delete('memoryChunks', chunk._id)
        }
      }

      for (const chunk of chunks) {
        await ctx.db.insert('memoryChunks', {
          path,
          source,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          hash: chunk.hash,
          model: 'text-embedding-3-small',
          text: chunk.text,
          embedding: chunk.embedding,
          updatedAt: Date.now(),
          agentId,
          fileId,
        })
      }
    }

    if (existingFile && existingFile.hash !== hash) {
      await ctx.db.patch('memoryFiles', fileId, { hash, mtime, size })
    }

    return { fileId: fileId.toString() }
  },
})

export const deleteFile = mutation({
  args: {
    path: v.string(),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const { path, agentId } = args

    const file = await ctx.db
      .query('memoryFiles')
      .withIndex('by_path', (q) => q.eq('path', path).eq('agentId', agentId))
      .first()

    if (!file) return

    const chunks = await ctx.db
      .query('memoryChunks')
      .withIndex('by_file', (q) => q.eq('fileId', file._id))
      .collect()

    for (const chunk of chunks) {
      await ctx.db.delete('memoryChunks', chunk._id)
    }

    await ctx.db.delete('memoryFiles', file._id)
  },
})

export const getFile = query({
  args: {
    path: v.string(),
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('memoryFiles')
      .withIndex('by_path', (q) => q.eq('path', args.path).eq('agentId', args.agentId))
      .first()
  },
})

export const listFiles = query({
  args: {
    agentId: v.string(),
    source: v.optional(v.union(v.literal('memory'), v.literal('sessions'))),
  },
  handler: async (ctx, args) => {
    let queryBuilder = ctx.db
      .query('memoryFiles')
      .withIndex('by_agent', (q) => q.eq('agentId', args.agentId))

    if (args.source) {
      queryBuilder = ctx.db
        .query('memoryFiles')
        .withIndex('by_source', (q) =>
          q.eq('source', args.source as 'memory' | 'sessions').eq('agentId', args.agentId),
        )
    }

    return await queryBuilder.collect()
  },
})

export const getSyncStatus = query({
  args: {
    agentId: v.string(),
  },
  handler: async (ctx, args) => {
    const syncState = await ctx.db
      .query('memorySyncState')
      .withIndex('by_agent', (q) => q.eq('agentId', args.agentId))
      .first()

    if (!syncState) {
      return {
        lastFullSync: 0,
        pendingFiles: [],
        dirty: false,
      }
    }

    return {
      lastFullSync: syncState.lastFullSync,
      pendingFiles: syncState.pendingFiles,
      dirty: syncState.dirty,
      error: syncState.error,
    }
  },
})

export const updateSyncStatus = mutation({
  args: {
    agentId: v.string(),
    lastFullSync: v.optional(v.number()),
    pendingFiles: v.optional(v.array(v.string())),
    dirty: v.optional(v.boolean()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('memorySyncState')
      .withIndex('by_agent', (q) => q.eq('agentId', args.agentId))
      .first()

    if (existing) {
      if (args.lastFullSync !== undefined) {
        await ctx.db.patch('memorySyncState', existing._id, {
          lastFullSync: args.lastFullSync,
        })
      }
      if (args.pendingFiles !== undefined) {
        await ctx.db.patch('memorySyncState', existing._id, {
          pendingFiles: args.pendingFiles,
        })
      }
      if (args.dirty !== undefined) {
        await ctx.db.patch('memorySyncState', existing._id, {
          dirty: args.dirty,
        })
      }
      if (args.error !== undefined) {
        await ctx.db.patch('memorySyncState', existing._id, {
          error: args.error,
        })
      }
    }
  },
})
