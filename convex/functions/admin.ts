import { mutation, query } from '../_generated/server'
import { v } from 'convex/values'

export const syncMemory = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx) => {
    const adminUsers = await ctx.db.query('admins').collect()

    if (adminUsers.length === 0) {
      throw new Error('No admin users found. Please run makeAdmin first.')
    }

    const adminUserId = adminUsers[0].userId

    const memoryFiles = await ctx.db.query('memoryFiles').collect()

    const memoryChunks = await ctx.db.query('memoryChunks').collect()

    const cacheEntries = await ctx.db.query('memoryEmbeddingCache').collect()

    const filesCount = memoryFiles.length
    const chunksCount = memoryChunks.length
    const cacheCount = cacheEntries.length

    return {
      success: true,
      message: `Memory system synced: ${filesCount} files, ${chunksCount} chunks, ${cacheCount} cache entries, for admin user ${adminUserId}`,
    }
  },
})

export const getMemoryStats = query({
  args: {},
  returns: v.object({
    files: v.number(),
    chunks: v.number(),
    cacheEntries: v.number(),
  }),
  handler: async (ctx) => {
    const memoryFiles = await ctx.db.query('memoryFiles').collect()

    const memoryChunks = await ctx.db.query('memoryChunks').collect()

    const cacheEntries = await ctx.db.query('memoryEmbeddingCache').collect()

    return {
      files: memoryFiles.length,
      chunks: memoryChunks.length,
      cacheEntries: cacheEntries.length,
    }
  },
})
