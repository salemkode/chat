import { components } from '../_generated/api'
import { resolveAppPlan, type AppPlan } from './appPlan'

export type StripeSubscriptionRecord = {
  stripeSubscriptionId: string
  stripeCustomerId: string
  status: string
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  cancelAt?: number
  quantity?: number
  priceId: string
  metadata?: unknown
  orgId?: string
  userId?: string
}

export const APP_BILLING_ORG_ID = 'app'

const ACTIVE_BILLING_STATUSES = new Set(['active', 'trialing'])

function toEpochMs(timestamp: number) {
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
}

export function isStripeSubscriptionActive(
  subscription: StripeSubscriptionRecord | null | undefined,
) {
  return Boolean(
    subscription &&
    ACTIVE_BILLING_STATUSES.has(subscription.status) &&
    toEpochMs(subscription.currentPeriodEnd) > Date.now(),
  )
}

export async function getAppBillingSubscription(ctx: {
  runQuery: (
    reference: typeof components.stripe.public.getSubscriptionByOrgId,
    args: { orgId: string },
  ) => Promise<unknown>
}) {
  return (await ctx.runQuery(components.stripe.public.getSubscriptionByOrgId, {
    orgId: APP_BILLING_ORG_ID,
  })) as StripeSubscriptionRecord | null
}

export async function resolveEffectiveAppPlan(
  ctx: {
    runQuery: (
      reference: typeof components.stripe.public.getSubscriptionByOrgId,
      args: { orgId: string },
    ) => Promise<unknown>
  },
  settings?: { appPlan?: AppPlan | undefined },
) {
  const subscription = await getAppBillingSubscription(ctx)
  return isStripeSubscriptionActive(subscription)
    ? 'pro'
    : resolveAppPlan(settings)
}
