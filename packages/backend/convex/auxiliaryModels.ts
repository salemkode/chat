import { query, internalQuery } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from './lib/auth'
import {
  listAccessibleAuxiliaryRankables,
  resolveAuxiliaryModelForUser,
  toAuxiliaryCandidates,
} from './lib/auxiliaryModel'

const auxiliaryModelCandidateValidator = v.object({
  modelDocId: v.id('models'),
  modelId: v.string(),
  displayName: v.string(),
  estimatedCostPerExtraction: v.union(v.number(), v.null()),
  supportsTools: v.literal(true),
  isRecommended: v.boolean(),
})

export const listAuxiliaryModelCandidates = query({
  args: {},
  returns: v.array(auxiliaryModelCandidateValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    const [settings, rankables] = await Promise.all([
      ctx.db
        .query('userSettings')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique(),
      listAccessibleAuxiliaryRankables(ctx, userId),
    ])

    return toAuxiliaryCandidates(rankables, settings?.auxiliaryModelId)
  },
})

export const resolveAuxiliaryModel = internalQuery({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    return await resolveAuxiliaryModelForUser(ctx, args.userId)
  },
})
