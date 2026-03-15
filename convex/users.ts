import { getAuthUserId } from './lib/auth'
import { v } from 'convex/values'
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  QueryCtx,
} from "./_generated/server";
import { UserJSON } from "@clerk/backend";

const userSettingsValidator = v.object({
  _id: v.id('userSettings'),
  _creationTime: v.number(),
  userId: v.id('users'),
  displayName: v.optional(v.string()),
  image: v.optional(v.string()),
  bio: v.optional(v.string()),
  updatedAt: v.number(),
})

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity()
      if (identity === null) {
        return null
      }

      const user = await ctx.db
        .query('users')
        .withIndex('by_tokenIdentifier', (q) =>
          q.eq('tokenIdentifier', identity.tokenIdentifier),
        )
        .unique()

      return user
    } catch (error) {
      console.error('getProfile error:', error)
      return null
    }
  },
})

export const getOrCreateProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new Error('Not authenticated')
    }
    return userId
  },
})

export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new Error('Not authenticated')
    }
    return userId
  },
})

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      return null
    }
    const user = await ctx.db.get('users', userId)
    if (!user) return null

    // Get user settings
    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    return {
      ...user,
      settings: settings || null,
    }
  },
})

export const getSettings = query({
  args: {},
  returns: v.union(v.null(), userSettingsValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      return null
    }

    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    return settings
  },
})

export const updateSettings = mutation({
  args: {
    displayName: v.optional(v.string()),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new Error('Not authenticated')
    }

    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.displayName !== undefined && {
          displayName: args.displayName,
        }),
        ...(args.image !== undefined && { image: args.image }),
        ...(args.bio !== undefined && { bio: args.bio }),
        updatedAt: now,
      })
    } else {
      await ctx.db.insert('userSettings', {
        userId,
        displayName: args.displayName,
        image: args.image,
        bio: args.bio,
        updatedAt: now,
      })
    }

    return { success: true }
  },
})

export async function userQuery(
  ctx: QueryCtx,
  clerkUserId: string
) {
  return await ctx.db
    .query("users")
    .withIndex("clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();
}

/** Get user by Clerk use id (AKA "subject" on auth)  */
export const getUser = internalQuery({
  args: { subject: v.string() },
  async handler(ctx, args) {
    return await userQuery(ctx, args.subject);
  },
});

/** Create a new Clerk user or update existing Clerk user data. */
export const updateOrCreateUser = internalMutation({
  args: { clerkUser: v.any() }, // no runtime validation, trust Clerk
  async handler(ctx, { clerkUser }: { clerkUser: UserJSON }) {
    const userRecord = await userQuery(ctx, clerkUser.id);

    if (userRecord === null) {
      return await ctx.db.insert('users', {
        name: `${clerkUser.first_name} ${clerkUser.last_name}`,
        image: clerkUser.image_url,
        email: clerkUser.email_addresses[0].email_address,
        emailVerificationTime: clerkUser.email_addresses[0].verification?.status === 'verified' ? Date.now() : undefined,
        isAnonymous: false,
        clerkUserId: clerkUser.id,
      })
    }

    await ctx.db.patch(userRecord._id, {
      name: `${clerkUser.first_name} ${clerkUser.last_name}`,
      image: clerkUser.image_url,
      email: clerkUser.email_addresses[0].email_address,
      emailVerificationTime: clerkUser.email_addresses[0].verification?.status === 'verified' ? Date.now() : undefined,
      clerkUserId: clerkUser.id,
    })

    return userRecord?._id || null;
  },
});

/** Delete a user by clerk user ID. */
export const deleteUser = internalMutation({
  args: { id: v.string() },
  async handler(ctx, { id }) {
    const userRecord = await userQuery(ctx, id);

    if (userRecord === null) {
      console.warn("can't delete user, does not exist", id);
    } else {
      await ctx.db.delete(userRecord._id);
    }
  },
});

