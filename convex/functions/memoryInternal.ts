import { query, internalQuery } from '../_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '../lib/auth'

export const listAllUserMemories = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const results = await ctx.db
      .query('userMemories')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(1000)

    return results.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      content: r.content,
      category: r.category,
      tags: r.tags,
      source: r.source,
      embedding: r.embedding,
      userId: r.userId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  },
})

export const listAllThreadMemories = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const results = await ctx.db
      .query('threadMemories')
      .order('desc')
      .take(1000)

    return results.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      content: r.content,
      category: r.category,
      source: r.source,
      embedding: r.embedding,
      userId: r.userId,
      threadId: r.threadId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  },
})

export const listAllProjectMemories = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const results = await ctx.db
      .query('projectMemories')
      .order('desc')
      .take(1000)

    return results.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      content: r.content,
      category: r.category,
      source: r.source,
      embedding: r.embedding,
      userId: r.userId,
      projectId: r.projectId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  },
})

export const getUserMemoriesByIds = internalQuery({
  args: {
    ids: v.array(v.id('userMemories')),
  },
  handler: async (ctx, args) => {
    const results = []
    for (const id of args.ids) {
      const doc = await ctx.db.get('userMemories', id)
      if (doc) {
        results.push({
          id: doc._id.toString(),
          title: doc.title,
          content: doc.content,
          category: doc.category,
          tags: doc.tags,
          source: doc.source,
          embedding: doc.embedding,
          userId: doc.userId,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        })
      }
    }
    return results
  },
})

export const getThreadMemoriesByIds = internalQuery({
  args: {
    ids: v.array(v.id('threadMemories')),
  },
  handler: async (ctx, args) => {
    const results = []
    for (const id of args.ids) {
      const doc = await ctx.db.get('threadMemories', id)
      if (doc) {
        results.push({
          id: doc._id.toString(),
          title: doc.title,
          content: doc.content,
          category: doc.category,
          source: doc.source,
          embedding: doc.embedding,
          userId: doc.userId,
          threadId: doc.threadId,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        })
      }
    }
    return results
  },
})

export const getProjectMemoriesByIds = internalQuery({
  args: {
    ids: v.array(v.id('projectMemories')),
  },
  handler: async (ctx, args) => {
    const results = []
    for (const id of args.ids) {
      const doc = await ctx.db.get('projectMemories', id)
      if (doc) {
        results.push({
          id: doc._id.toString(),
          title: doc.title,
          content: doc.content,
          category: doc.category,
          source: doc.source,
          embedding: doc.embedding,
          userId: doc.userId,
          projectId: doc.projectId,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        })
      }
    }
    return results
  },
})

export const getUserMemoryById = internalQuery({
  args: {
    id: v.id('userMemories'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get('userMemories', args.id)
  },
})

export const getThreadMemoryById = internalQuery({
  args: {
    id: v.id('threadMemories'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get('threadMemories', args.id)
  },
})

export const getProjectMemoryById = internalQuery({
  args: {
    id: v.id('projectMemories'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get('projectMemories', args.id)
  },
})
