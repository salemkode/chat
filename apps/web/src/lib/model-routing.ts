export type SelectionTier = 'free' | 'pro' | 'advanced'

export function getSelectionTierFromAppPlan(appPlan?: 'free' | 'pro'): SelectionTier {
  return appPlan === 'pro' ? 'pro' : 'free'
}
