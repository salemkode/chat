import type { Doc, Id } from '../_generated/dataModel'

export type OfferAccessFlags = {
  /** When true, free-tier users may use a non-free model (active free_access window). */
  grantsFreeAccess: boolean
  /** Model has availability_window offers; when true and availabilityOpen is false, hide for everyone. */
  blocksAllAccess: boolean
}

function offerCoversNow(
  offer: Doc<'modelOffers'>,
  nowMs: number,
): boolean {
  return (
    offer.isEnabled &&
    offer.startsAt <= nowMs &&
    offer.endsAt >= nowMs
  )
}

/**
 * Derive per-model flags from a preloaded offer list (single collect in the handler).
 */
export function getModelOfferAccessFlags(
  modelId: Id<'models'>,
  offers: Doc<'modelOffers'>[],
  nowMs: number,
): OfferAccessFlags {
  let grantsFreeAccess = false
  let hasAvailabilityWindow = false
  let availabilityOpen = false

  for (const offer of offers) {
    if (offer.modelId !== modelId) continue
    const covers = offerCoversNow(offer, nowMs)
    if (offer.kind === 'free_access' && covers) {
      grantsFreeAccess = true
    }
    if (offer.kind === 'availability_window') {
      hasAvailabilityWindow = true
      if (covers) {
        availabilityOpen = true
      }
    }
  }

  return {
    grantsFreeAccess,
    blocksAllAccess: hasAvailabilityWindow && !availabilityOpen,
  }
}
