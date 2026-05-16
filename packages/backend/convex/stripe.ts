import { StripeSubscriptions } from '@convex-dev/stripe'
import { ConvexError, v } from 'convex/values'
import { components, internal } from './_generated/api'
import { action, type ActionCtx } from './_generated/server'
import {
  APP_BILLING_ORG_ID,
  getAppBillingSubscription,
  isStripeSubscriptionActive,
} from './lib/billing'

const stripeClient = new StripeSubscriptions(components.stripe, {})

function requireStripePriceId() {
  const priceId = process.env.STRIPE_PRO_PRICE_ID
  if (!priceId) {
    throw new ConvexError({
      code: 'FAILED_PRECONDITION',
      message: 'Missing STRIPE_PRO_PRICE_ID environment variable',
    })
  }
  return priceId
}

async function requireAdminAccess(ctx: ActionCtx) {
  const adminContext = await ctx.runQuery(internal.admin.getAdminContext, {})
  if (!adminContext.userId) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to manage billing',
    })
  }

  if (!adminContext.isAdmin) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'Admin access required to manage billing',
    })
  }

  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to manage billing',
    })
  }

  return identity
}

function normalizeOrigin(origin: string) {
  return new URL(origin).origin
}

export const createProSubscriptionCheckout = action({
  args: {
    origin: v.string(),
  },
  returns: v.object({
    sessionId: v.string(),
    url: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const identity = await requireAdminAccess(ctx)
    const origin = normalizeOrigin(args.origin)
    const priceId = requireStripePriceId()
    const existingSubscription = await getAppBillingSubscription(ctx)
    if (isStripeSubscriptionActive(existingSubscription)) {
      throw new ConvexError({
        code: 'FAILED_PRECONDITION',
        message: 'The app already has an active Pro subscription',
      })
    }
    const customerId =
      existingSubscription?.stripeCustomerId ||
      (
        await stripeClient.getOrCreateCustomer(ctx, {
          userId: identity.subject,
          email: identity.email,
          name: identity.name,
        })
      ).customerId

    return await stripeClient.createCheckoutSession(ctx, {
      priceId,
      customerId,
      mode: 'subscription',
      successUrl: `${origin}/admin/settings?billing=success`,
      cancelUrl: `${origin}/admin/settings?billing=canceled`,
      metadata: {
        appBillingOrgId: APP_BILLING_ORG_ID,
      },
      subscriptionMetadata: {
        orgId: APP_BILLING_ORG_ID,
        initiatedBy: identity.subject,
      },
    })
  },
})

export const createBillingPortalSession = action({
  args: {
    origin: v.string(),
  },
  returns: v.object({
    url: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx)
    const origin = normalizeOrigin(args.origin)
    const existingSubscription = await getAppBillingSubscription(ctx)

    if (!existingSubscription?.stripeCustomerId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'No Stripe customer found for the app billing account',
      })
    }

    return await stripeClient.createCustomerPortalSession(ctx, {
      customerId: existingSubscription.stripeCustomerId,
      returnUrl: `${origin}/admin/settings`,
    })
  },
})
