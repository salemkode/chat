import { v, ConvexError } from 'convex/values'
import {
  action,
  internalAction,
  internalQuery,
  query,
} from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import { internal } from '../_generated/api'
import { getAuthUserId } from '../lib/auth'
import { requireProjectRole } from '../lib/projectAccess'

function normalizeQueryTerms(query: string) {
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 10)
}

function scoreSnippet(args: { text: string; terms: string[] }) {
  const lowered = args.text.toLowerCase()
  let score = 0
  for (const term of args.terms) {
    if (lowered.includes(term)) {
      score += 1
    }
  }
  return score
}

export const getArtifactByIdForProject = internalQuery({
  args: {
    projectId: v.id('projects'),
    artifactId: v.id('projectArtifacts'),
    userId: v.id('users'),
  },
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      title: v.string(),
      kind: v.string(),
      provider: v.string(),
      url: v.optional(v.string()),
      includeInContext: v.boolean(),
      pinned: v.boolean(),
      content: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId: args.userId,
      minimumRole: 'viewer',
    })

    const artifact = await ctx.db.get(args.artifactId)
    if (!artifact || artifact.projectId !== args.projectId) {
      return null
    }

    const content = await ctx.db
      .query('projectArtifactContents')
      .withIndex('by_artifact', (q) => q.eq('artifactId', artifact._id))
      .unique()

    return {
      id: artifact._id.toString(),
      title: artifact.title,
      kind: artifact.kind,
      provider: artifact.provider,
      url: artifact.url,
      includeInContext: artifact.includeInContext,
      pinned: artifact.pinned,
      content: content?.text,
    }
  },
})

export const searchProjectContext = internalQuery({
  args: {
    projectId: v.id('projects'),
    userId: v.id('users'),
    query: v.string(),
    explicitArtifactIds: v.optional(v.array(v.id('projectArtifacts'))),
    maxResults: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      artifactId: v.id('projectArtifacts'),
      title: v.string(),
      kind: v.string(),
      provider: v.string(),
      snippet: v.optional(v.string()),
      url: v.optional(v.string()),
      score: v.number(),
      pinned: v.boolean(),
      includeInContext: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId: args.userId,
      minimumRole: 'viewer',
    })

    const maxResults = Math.max(1, Math.min(args.maxResults ?? 8, 20))
    const artifacts = await ctx.db
      .query('projectArtifacts')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect()

    const explicitIds = new Set(
      (args.explicitArtifactIds ?? []).map((id) => id.toString()),
    )
    const terms = normalizeQueryTerms(args.query)

    const contents = await ctx.db
      .query('projectArtifactContents')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect()
    const contentByArtifact = new Map(
      contents.map((item) => [item.artifactId.toString(), item]),
    )

    const scored = artifacts
      .filter((artifact) => artifact.status !== 'archived')
      .map((artifact) => {
        const content = contentByArtifact.get(artifact._id.toString())
        const haystack = [
          artifact.title,
          artifact.subtitle ?? '',
          artifact.url ?? '',
          content?.text ?? '',
        ]
          .filter(Boolean)
          .join('\n')
        const isExplicit = explicitIds.has(artifact._id.toString())
        const keywordScore =
          terms.length > 0 ? scoreSnippet({ text: haystack, terms }) : 0
        const base =
          (artifact.pinned ? 3 : 0) +
          (artifact.includeInContext ? 2 : 0) +
          keywordScore
        const score = (isExplicit ? 100 : 0) + base
        return {
          artifactId: artifact._id,
          title: artifact.title,
          kind: artifact.kind,
          provider: artifact.provider,
          snippet: content?.text?.slice(0, 480),
          url: artifact.url,
          score,
          pinned: artifact.pinned,
          includeInContext: artifact.includeInContext,
        }
      })
      .filter((item) => item.score > 0 || explicitIds.has(item.artifactId.toString()))
      .sort((a, b) => b.score - a.score)

    return scored.slice(0, maxResults)
  },
})

export const buildPromptProjectContext = internalAction({
  args: {
    userId: v.id('users'),
    threadId: v.string(),
    projectId: v.optional(v.id('projects')),
    prompt: v.string(),
    explicitArtifactIds: v.optional(v.array(v.id('projectArtifacts'))),
  },
  returns: v.object({
    text: v.string(),
    hits: v.array(
      v.object({
        artifactId: v.string(),
        title: v.string(),
        kind: v.string(),
        provider: v.string(),
        snippet: v.optional(v.string()),
        url: v.optional(v.string()),
        score: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    if (!args.projectId) {
      return {
        text: 'No project artifacts are linked to this thread.',
        hits: [],
      }
    }

    const hits = await ctx.runQuery(
      internal.functions.projectRetrieval.searchProjectContext,
      {
        projectId: args.projectId,
        userId: args.userId,
        query: args.prompt,
        explicitArtifactIds: args.explicitArtifactIds,
        maxResults: 8,
      },
    )

    if (!hits.length) {
      return {
        text: 'No relevant project artifacts were found for this prompt.',
        hits: [],
      }
    }

    const lines = [
      'Project artifact context:',
      ...hits.map((hit, index) => {
        const title = `${index + 1}. ${hit.title} (${hit.kind}/${hit.provider})`
        const url = hit.url ? `URL: ${hit.url}` : null
        const snippet = hit.snippet ? `Snippet: ${hit.snippet}` : null
        return [title, url, snippet].filter(Boolean).join('\n')
      }),
    ]

    return {
      text: lines.join('\n\n'),
      hits: hits.map((hit) => ({
        artifactId: hit.artifactId.toString(),
        title: hit.title,
        kind: hit.kind,
        provider: hit.provider,
        snippet: hit.snippet,
        url: hit.url,
        score: hit.score,
      })),
    }
  },
})

export const searchProjectArtifactsForMention = query({
  args: {
    projectId: v.id('projects'),
    query: v.string(),
    maxResults: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      title: v.string(),
      kind: v.string(),
      provider: v.string(),
      subtitle: v.optional(v.string()),
      url: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId,
      minimumRole: 'viewer',
    })

    const needle = args.query.trim().toLowerCase()
    const maxResults = Math.max(1, Math.min(args.maxResults ?? 8, 20))
    const items = await ctx.db
      .query('projectArtifacts')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect()

    return items
      .filter((item) => {
        if (!needle) return true
        return `${item.title}\n${item.subtitle ?? ''}\n${item.url ?? ''}`
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, maxResults)
      .map((item) => ({
        id: item._id.toString(),
        title: item.title,
        kind: item.kind,
        provider: item.provider,
        subtitle: item.subtitle,
        url: item.url,
      }))
  },
})

export const getProjectArtifact = action({
  args: {
    projectId: v.id('projects'),
    artifactId: v.id('projectArtifacts'),
  },
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      title: v.string(),
      kind: v.string(),
      provider: v.string(),
      url: v.optional(v.string()),
      includeInContext: v.boolean(),
      pinned: v.boolean(),
      content: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to load artifacts',
      })
    }

    return await ctx.runQuery(
      internal.functions.projectRetrieval.getArtifactByIdForProject,
      {
        projectId: args.projectId,
        artifactId: args.artifactId,
        userId,
      },
    )
  },
})
