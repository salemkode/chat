import type { UserIdentity } from 'convex/server'
import type { MutationCtx, QueryCtx } from '../_generated/server'

export type AuthCtx = MutationCtx | QueryCtx
type WritableAuthCtx = MutationCtx

function canWrite(ctx: AuthCtx): ctx is WritableAuthCtx {
  return 'insert' in ctx.db && 'patch' in ctx.db
}

function getIdentityName(identity: UserIdentity) {
  if (identity.name) return identity.name
  const fullName = [identity.givenName, identity.familyName].filter(Boolean).join(' ').trim()
  return fullName || undefined
}

export async function getAuthUserId(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (identity === null) {
    return null
  }

  const tokenIdentifier = identity.tokenIdentifier
  const email = identity.email
  const name = getIdentityName(identity)
  const image = identity.pictureUrl
  const phone = identity.phoneNumber

  let user = await ctx.db
    .query('users')
    .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', tokenIdentifier))
    .unique()

  if (!user && email) {
    user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', email))
      .unique()
  }

  if (!user) {
    if (!canWrite(ctx)) {
      return null
    }
    return await ctx.db.insert('users', {
      tokenIdentifier,
      name,
      image,
      email,
      emailVerificationTime: identity.emailVerified ? Date.now() : undefined,
      phone,
      phoneVerificationTime: identity.phoneNumberVerified ? Date.now() : undefined,
      isAnonymous: false,
    })
  }

  const patch: Record<string, string | number | boolean | undefined> = {}

  if (user.tokenIdentifier !== tokenIdentifier) {
    patch.tokenIdentifier = tokenIdentifier
  }
  if (name && user.name !== name) {
    patch.name = name
  }
  if (image && user.image !== image) {
    patch.image = image
  }
  if (email && user.email !== email) {
    patch.email = email
  }
  if (phone && user.phone !== phone) {
    patch.phone = phone
  }

  if (canWrite(ctx) && Object.keys(patch).length > 0) {
    await ctx.db.patch(user._id, patch)
  }

  return user._id
}
