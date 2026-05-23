import type { Doc } from '../_generated/dataModel'
import { estimateCostFromProfile } from './pricingTier'

type StudioCostProfile = Pick<
  Doc<'modelSelectionProfiles'>,
  'pricing' | 'intelligenceIndexRunCostUsd'
> | null

/** USD cost signal fed to the Python auto router (normalized downstream). */
export function resolveStudioRawPrice(profile: StudioCostProfile): number {
  const indexCost = profile?.intelligenceIndexRunCostUsd
  if (indexCost !== undefined && Number.isFinite(indexCost) && indexCost >= 0) {
    return indexCost
  }
  return estimateCostFromProfile(profile?.pricing ?? undefined, 1500, 700) ?? 0
}
