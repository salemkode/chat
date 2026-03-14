import { action, query } from '../_generated/server'
import { v } from 'convex/values'

export const vectorSearchChunks = action({
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
  handler: async (_ctx, args) => {
    const { query } = args

    if (!query.trim()) return []

    // const embedding = await getQueryEmbedding(query)

    // const results = await ctx.vectorSearch('memoryChunks', 'by_embedding', {
    //   vectorField: 'embedding',
    //   vector: embedding,
    //   limit: Math.min(maxResults * 2, 100),
    // })

    return []
    // return results
    //   .filter((r) => r._score !== undefined && r._score >= minScore)
    //   .slice(0, maxResults)
    //   .map((r) => ({
    //     id: r._id.toString(),
    //     path: r.path,
    //     startLine: r.start_line,
    //     endLine: r.end_line,
    //     score: 1 - r._score,
    //     snippet: r.text.slice(0, 700),
    //     source: r.source,
    //   }))
  },
})

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
  handler: async (ctx, args) => {
    const { agentId, source, pathPattern } = args

    let queryBuilder = ctx.db
      .query('memoryFiles')
      .withIndex('by_agent', (q) => q.eq('agentId', agentId))

    if (source) {
      queryBuilder = ctx.db
        .query('memoryFiles')
        .withIndex('by_source', (q) =>
          q.eq('source', source).eq('agentId', agentId),
        )
    }

    const results = await queryBuilder.collect()

    if (pathPattern) {
      const regex = new RegExp(pathPattern, 'i')
      return results
        .filter((r) => regex.test(r.path))
        .map((r) => ({
          id: r._id.toString(),
          path: r.path,
          hash: r.hash,
          mtime: r.mtime,
          size: r.size,
          source: r.source,
        }))
    }

    return results.map((r) => ({
      id: r._id.toString(),
      path: r.path,
      hash: r.hash,
      mtime: r.mtime,
      size: r.size,
      source: r.source,
    }))
  },
})

// async function getQueryEmbedding(query: string): Promise<number[]> {
//   try {
//     const response = await fetch('https://api.openai.com/v1/embeddings', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//       },
//       body: JSON.stringify({
//         model: 'text-embedding-3-small',
//         input: query,
//         encoding: 'float',
//       }),
//     })
//
//     if (!response.ok) {
//       throw new Error(`Embedding API error: ${response.status}`)
//     }
//
//     const data = await response.json()
//
//     if (!data.data || data.data.length === 0) {
//       return []
//     }
//
//     return data.data[0].embedding
//   } catch (error) {
//     console.error('Failed to get query embedding:', error)
//     return []
//   }
// }
