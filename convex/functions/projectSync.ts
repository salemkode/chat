import { internal } from '../_generated/api'
import { internalAction, internalMutation, internalQuery } from '../_generated/server'
import { v } from 'convex/values'

function stripHtmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export const getSyncJobById = internalQuery({
  args: {
    jobId: v.id('projectSyncJobs'),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('projectSyncJobs'),
      sourceId: v.id('projectSources'),
      projectId: v.id('projects'),
      status: v.union(
        v.literal('queued'),
        v.literal('running'),
        v.literal('done'),
        v.literal('error'),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) {
      return null
    }
    return {
      _id: job._id,
      sourceId: job.sourceId,
      projectId: job.projectId,
      status: job.status,
    }
  },
})

export const markSyncJobRunning = internalMutation({
  args: {
    jobId: v.id('projectSyncJobs'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) {
      return null
    }

    await ctx.db.patch(job._id, {
      status: 'running',
      startedAt: Date.now(),
      error: undefined,
    })
    return null
  },
})

export const markSyncJobDone = internalMutation({
  args: {
    jobId: v.id('projectSyncJobs'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) {
      return null
    }

    await ctx.db.patch(job._id, {
      status: 'done',
      finishedAt: Date.now(),
      error: undefined,
    })
    return null
  },
})

export const markSyncJobError = internalMutation({
  args: {
    jobId: v.id('projectSyncJobs'),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)
    if (!job) {
      return null
    }

    await ctx.db.patch(job._id, {
      status: 'error',
      finishedAt: Date.now(),
      error: args.error,
    })
    return null
  },
})

export const syncManualLinkSource = internalAction({
  args: {
    sourceId: v.id('projectSources'),
    projectId: v.id('projects'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const artifacts = await ctx.runQuery(
      internal.projectContext.listArtifactsByProjectInternal,
      {
        projectId: args.projectId,
      },
    )

    for (const artifact of artifacts) {
      if (artifact.sourceId !== args.sourceId || artifact.kind !== 'external_link') {
        continue
      }
      if (!artifact.url) {
        continue
      }

      try {
        const response = await fetch(artifact.url)
        if (!response.ok) {
          throw new Error(`Failed to fetch ${artifact.url}`)
        }
        const contentType = response.headers.get('content-type') || ''
        const raw = await response.text()
        const text = contentType.includes('text/html')
          ? stripHtmlToText(raw)
          : raw.trim()
        const normalized = text.slice(0, 50_000)

        await ctx.runMutation(
          internal.projectContext.upsertProjectArtifactContentInternal,
          {
            artifactId: artifact._id,
            projectId: args.projectId,
            text: normalized,
            contentHash: `${normalized.length}:${artifact._id}`,
            extractionStatus: 'ready',
          },
        )
      } catch (error) {
        await ctx.runMutation(
          internal.projectContext.upsertProjectArtifactContentInternal,
          {
            artifactId: artifact._id,
            projectId: args.projectId,
            text: '',
            contentHash: '',
            extractionStatus: 'error',
            error: error instanceof Error ? error.message : 'Failed to extract URL',
          },
        )
      }
    }

    return null
  },
})

export const runSyncJob = internalAction({
  args: {
    jobId: v.id('projectSyncJobs'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.runQuery(internal.functions.projectSync.getSyncJobById, {
      jobId: args.jobId,
    })
    if (!job) {
      return null
    }

    await ctx.runMutation(internal.functions.projectSync.markSyncJobRunning, {
      jobId: args.jobId,
    })

    try {
      const source = await ctx.runQuery(internal.projectContext.getProjectSourceInternal, {
        sourceId: job.sourceId,
      })
      if (!source) {
        throw new Error('Source not found')
      }

      if (source.kind === 'manual_links') {
        await ctx.runAction(internal.functions.projectSync.syncManualLinkSource, {
          sourceId: source._id,
          projectId: source.projectId,
        })
      }

      await ctx.runMutation(internal.functions.projectSync.markSyncJobDone, {
        jobId: args.jobId,
      })
      await ctx.runMutation(internal.projectContext.touchProjectSourceInternal, {
        sourceId: source._id,
        clearError: true,
      })
    } catch (error) {
      await ctx.runMutation(internal.functions.projectSync.markSyncJobError, {
        jobId: args.jobId,
        error: error instanceof Error ? error.message : 'Sync failed',
      })
    }

    return null
  },
})
