import { v } from 'convex/values'

export const appPlanValidator = v.union(v.literal('free'), v.literal('pro'))

export type AppPlan = 'free' | 'pro'

export const DEFAULT_APP_PLAN: AppPlan = 'free'

export function resolveAppPlan(settings?: { appPlan?: AppPlan | undefined }) {
  return settings?.appPlan ?? DEFAULT_APP_PLAN
}

export function isModelAllowedForPlan(
  model: { isFree: boolean },
  settings?: { appPlan?: AppPlan | undefined },
) {
  return resolveAppPlan(settings) === 'pro' || model.isFree
}

/**
 * Plan gating plus time-limited free_access promos (see modelOffers).
 * Call sites must exclude models with offer flags.blocksAllAccess before this.
 */
export function isModelUsableForPlan(args: {
  model: { isFree: boolean }
  effectiveAppPlan: AppPlan
  hasActiveFreeAccessOffer: boolean
}) {
  if (args.effectiveAppPlan === 'pro') return true
  if (args.model.isFree) return true
  return args.hasActiveFreeAccessOffer
}
