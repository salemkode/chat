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
