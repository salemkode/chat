import { randomUUID } from 'crypto'
import { ConvexError, v } from 'convex/values'
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import type { Id } from './_generated/dataModel'
import { getAuthUserId } from './lib/auth'
import { encryptSecret } from './lib/integrationCrypto'
import { requireProjectRole } from './lib/projectAccess'

const oauthProviderValidator = v.union(v.literal('github'), v.literal('google'))

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: `Missing required environment variable: ${name}`,
    })
  }
  return value
}

function resolveRedirectBaseUrl() {
  const fromEnv =
    process.env.CONVEX_SITE_URL?.trim() ||
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim()
  if (!fromEnv) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message:
        'Missing CONVEX_SITE_URL or PUBLIC_APP_URL for OAuth redirect handling',
    })
  }
  return fromEnv.replace(/\/+$/, '')
}

function callbackUrlForProvider(provider: 'github' | 'google') {
  const base = resolveRedirectBaseUrl()
  return `${base}/oauth/${provider}/callback`
}

function normalizeRedirectTo(args: {
  redirectTo?: string
  projectId?: Id<'projects'>
}) {
  if (args.redirectTo?.trim()) {
    return args.redirectTo.trim()
  }
  if (args.projectId) {
    return `/projects/${args.projectId}`
  }
  return '/'
}

export const listConnections = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      provider: oauthProviderValidator,
      accountLabel: v.string(),
      accountSubject: v.string(),
      scopes: v.array(v.string()),
      status: v.union(
        v.literal('active'),
        v.literal('expired'),
        v.literal('revoked'),
        v.literal('error'),
      ),
      expiresAt: v.optional(v.number()),
      lastValidatedAt: v.optional(v.number()),
      lastSyncAt: v.optional(v.number()),
      lastError: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    const items = await ctx.db
      .query('integrationConnections')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', userId))
      .order('desc')
      .collect()

    return items.map((item) => ({
      id: item._id.toString(),
      provider: item.provider,
      accountLabel: item.accountLabel,
      accountSubject: item.accountSubject,
      scopes: item.scopes,
      status: item.status,
      expiresAt: item.expiresAt,
      lastValidatedAt: item.lastValidatedAt,
      lastSyncAt: item.lastSyncAt,
      lastError: item.lastError,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))
  },
})

export const disconnectConnection = mutation({
  args: {
    connectionId: v.id('integrationConnections'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to disconnect a connection',
      })
    }

    const connection = await ctx.db.get(args.connectionId)
    if (!connection || connection.ownerUserId !== userId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Connection not found',
      })
    }

    await ctx.db.patch(connection._id, {
      status: 'revoked',
      updatedAt: Date.now(),
    })
    return null
  },
})

export const validateConnection = mutation({
  args: {
    connectionId: v.id('integrationConnections'),
  },
  returns: v.object({
    status: v.union(
      v.literal('active'),
      v.literal('expired'),
      v.literal('revoked'),
      v.literal('error'),
    ),
    hasAccessToken: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to validate a connection',
      })
    }

    const connection = await ctx.db.get(args.connectionId)
    if (!connection || connection.ownerUserId !== userId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Connection not found',
      })
    }

    const now = Date.now()
    const nextStatus =
      connection.status === 'revoked'
        ? 'revoked'
        : connection.expiresAt && connection.expiresAt <= now
          ? 'expired'
          : 'active'

    await ctx.db.patch(connection._id, {
      status: nextStatus,
      lastValidatedAt: now,
      updatedAt: now,
    })

    return {
      status: nextStatus,
      hasAccessToken: Boolean(connection.accessTokenCiphertext),
    }
  },
})

export const getOAuthStartUrl = mutation({
  args: {
    provider: oauthProviderValidator,
    projectId: v.optional(v.id('projects')),
    redirectTo: v.optional(v.string()),
  },
  returns: v.object({
    url: v.string(),
    provider: oauthProviderValidator,
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to connect integrations',
      })
    }

    if (args.projectId) {
      await requireProjectRole(ctx, {
        projectId: args.projectId,
        userId,
        minimumRole: 'owner',
      })
    }

    const state = randomUUID()
    const now = Date.now()
    const redirectTo = normalizeRedirectTo({
      projectId: args.projectId,
      redirectTo: args.redirectTo,
    })

    await ctx.db.insert('oauthStates', {
      userId,
      provider: args.provider,
      state,
      codeVerifier: undefined,
      redirectTo,
      expiresAt: now + 1000 * 60 * 10,
      createdAt: now,
    })

    if (args.provider === 'github') {
      const clientId = requireEnv('GITHUB_CLIENT_ID')
      const url = new URL('https://github.com/login/oauth/authorize')
      url.searchParams.set('client_id', clientId)
      url.searchParams.set('redirect_uri', callbackUrlForProvider('github'))
      url.searchParams.set('scope', 'repo read:user user:email')
      url.searchParams.set('state', state)
      return { url: url.toString(), provider: 'github' }
    }

    const clientId = requireEnv('GOOGLE_CLIENT_ID')
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', callbackUrlForProvider('google'))
    url.searchParams.set('response_type', 'code')
    url.searchParams.set(
      'scope',
      'openid email profile https://www.googleapis.com/auth/gmail.readonly',
    )
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('include_granted_scopes', 'true')
    url.searchParams.set('prompt', 'consent')
    url.searchParams.set('state', state)
    return { url: url.toString(), provider: 'google' }
  },
})

export const consumeOAuthState = internalMutation({
  args: {
    provider: oauthProviderValidator,
    state: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id('users'),
      redirectTo: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query('oauthStates')
      .withIndex('by_state', (q) => q.eq('state', args.state))
      .unique()

    if (!state || state.provider !== args.provider) {
      return null
    }

    await ctx.db.delete(state._id)
    if (state.expiresAt < Date.now()) {
      return null
    }

    return {
      userId: state.userId,
      redirectTo: state.redirectTo,
    }
  },
})

export const exchangeOAuthCode = internalAction({
  args: {
    provider: oauthProviderValidator,
    code: v.string(),
  },
  returns: v.object({
    provider: oauthProviderValidator,
    accountSubject: v.string(),
    accountLabel: v.string(),
    scopes: v.array(v.string()),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  }),
  handler: async (_ctx, args) => {
    if (args.provider === 'github') {
      const clientId = requireEnv('GITHUB_CLIENT_ID')
      const clientSecret = requireEnv('GITHUB_CLIENT_SECRET')
      const tokenResponse = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code: args.code,
            redirect_uri: callbackUrlForProvider('github'),
          }),
        },
      )

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange GitHub OAuth code')
      }

      const tokenJson = (await tokenResponse.json()) as {
        access_token?: string
        refresh_token?: string
        expires_in?: number
        scope?: string
      }
      if (!tokenJson.access_token) {
        throw new Error('GitHub OAuth response missing access_token')
      }

      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'salemkode-chat',
        },
      })

      if (!userResponse.ok) {
        throw new Error('Failed to fetch GitHub account profile')
      }

      const userJson = (await userResponse.json()) as {
        id?: number
        login?: string
        name?: string
      }

      if (!userJson.id) {
        throw new Error('GitHub account profile missing id')
      }

      return {
        provider: 'github',
        accountSubject: String(userJson.id),
        accountLabel: userJson.login || userJson.name || String(userJson.id),
        scopes: tokenJson.scope ? tokenJson.scope.split(',').map((scope) => scope.trim()) : [],
        accessToken: tokenJson.access_token,
        refreshToken: tokenJson.refresh_token,
        expiresAt:
          typeof tokenJson.expires_in === 'number'
            ? Date.now() + tokenJson.expires_in * 1000
            : undefined,
      }
    }

    const clientId = requireEnv('GOOGLE_CLIENT_ID')
    const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET')
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: args.code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrlForProvider('google'),
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange Google OAuth code')
    }

    const tokenJson = (await tokenResponse.json()) as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      scope?: string
    }

    if (!tokenJson.access_token) {
      throw new Error('Google OAuth response missing access_token')
    }

    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
        },
      },
    )

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch Google account profile')
    }

    const profileJson = (await profileResponse.json()) as {
      sub?: string
      email?: string
      name?: string
    }

    if (!profileJson.sub) {
      throw new Error('Google account profile missing sub')
    }

    return {
      provider: 'google',
      accountSubject: profileJson.sub,
      accountLabel: profileJson.email || profileJson.name || profileJson.sub,
      scopes: tokenJson.scope
        ? tokenJson.scope.split(' ').map((scope) => scope.trim())
        : [],
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
      expiresAt:
        typeof tokenJson.expires_in === 'number'
          ? Date.now() + tokenJson.expires_in * 1000
          : undefined,
    }
  },
})

export const upsertOAuthConnection = internalMutation({
  args: {
    userId: v.id('users'),
    provider: oauthProviderValidator,
    accountSubject: v.string(),
    accountLabel: v.string(),
    scopes: v.array(v.string()),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  returns: v.id('integrationConnections'),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('integrationConnections')
      .withIndex('by_account_owner', (q) =>
        q
          .eq('ownerUserId', args.userId)
          .eq('provider', args.provider)
          .eq('accountSubject', args.accountSubject),
      )
      .unique()

    const now = Date.now()
    const patch = {
      ownerUserId: args.userId,
      provider: args.provider,
      accountSubject: args.accountSubject,
      accountLabel: args.accountLabel,
      scopes: args.scopes,
      accessTokenCiphertext: encryptSecret(args.accessToken),
      refreshTokenCiphertext: args.refreshToken
        ? encryptSecret(args.refreshToken)
        : undefined,
      expiresAt: args.expiresAt,
      status: 'active' as const,
      lastValidatedAt: now,
      updatedAt: now,
      lastError: undefined,
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }

    return await ctx.db.insert('integrationConnections', {
      ...patch,
      createdAt: now,
      lastSyncAt: undefined,
    })
  },
})

export const getConnectionByIdForOwner = internalQuery({
  args: {
    connectionId: v.id('integrationConnections'),
    ownerUserId: v.id('users'),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('integrationConnections'),
      accessTokenCiphertext: v.string(),
      ownerUserId: v.id('users'),
    }),
  ),
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId)
    if (!connection || connection.ownerUserId !== args.ownerUserId) {
      return null
    }
    return {
      _id: connection._id,
      ownerUserId: connection.ownerUserId,
      accessTokenCiphertext: connection.accessTokenCiphertext,
    }
  },
})
