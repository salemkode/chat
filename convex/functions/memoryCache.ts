import { query, mutation } from '../_generated/server'
import { v } from 'convex/values'

export const getCachedEmbedding = query({
  args: {
    provider: v.string(),
    model: v.string(),
    providerKey: v.string(),
    hash: v.string(),
  },
  handler: async (ctx, args) => {
    const cached = await ctx.db
      .query('memoryEmbeddingCache')
      .withIndex('by_composite', (q) =>
        q
          .eq('provider', args.provider)
          .eq('model', args.model)
          .eq('providerKey', args.providerKey)
          .eq('hash', args.hash),
      )
      .first()

    if (!cached) return null

    return {
      embedding: cached.embedding,
      dims: cached.dims,
    }
  },
})

export const cacheEmbedding = mutation({
  args: {
    provider: v.string(),
    model: v.string(),
    providerKey: v.string(),
    hash: v.string(),
    embedding: v.array(v.number()),
    dims: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { provider, model, providerKey, hash, embedding, dims } = args

    const existing = await ctx.db
      .query('memoryEmbeddingCache')
      .withIndex('by_composite', (q) =>
        q
          .eq('provider', provider)
          .eq('model', model)
          .eq('providerKey', providerKey)
          .eq('hash', hash),
      )
      .first()

    if (existing) {
      await ctx.db.patch('memoryEmbeddingCache', existing._id, {
        embedding,
        dims: dims ?? embedding.length,
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert('memoryEmbeddingCache', {
        provider,
        model,
        providerKey,
        hash,
        embedding,
        dims: dims ?? embedding.length,
        updatedAt: Date.now(),
      })
    }
  },
})

export const pruneOldCache = mutation({
  args: {
    maxEntries: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxEntries = args.maxEntries ?? 10000
    const cache = await ctx.db
      .query('memoryEmbeddingCache')
      .withIndex('by_updated', (q) => q)
      .order('desc')
      .take(maxEntries)

    const allCache = await ctx.db
      .query('memoryEmbeddingCache')
      .withIndex('by_updated', (q) => q)
      .collect()

    const toDelete = allCache.filter(
      (entry) => !cache.some((cached) => cached._id === entry._id),
    )

    for (const entry of toDelete) {
      await ctx.db.delete('memoryEmbeddingCache', entry._id)
    }

    return { deleted: toDelete.length }
  },
})

export const getCacheStats = query({
  handler: async (ctx) => {
    const all = await ctx.db
      .query('memoryEmbeddingCache')
      .withIndex('by_updated', (q) => q)
      .collect()

    return { count: all.length }
  },
})
