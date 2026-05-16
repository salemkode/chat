import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api, components, internal } from './_generated/api'
import { registerRoutes } from '@convex-dev/stripe'
import type { WebhookEvent } from '@clerk/backend'
import { Webhook } from 'svix'

function ensureEnvironmentVariable(name: string): string {
  const value = process.env[name]
  if (value === undefined) {
    throw new Error(`missing environment variable ${name}`)
  }
  return value
}

const webhookSecret = ensureEnvironmentVariable('CLERK_WEBHOOK_SIGNING_SECRET')

function verifySelectionApiKey(request: Request) {
  const expected = process.env.MODEL_SELECTION_API_KEY
  if (!expected) {
    throw new Error('missing environment variable MODEL_SELECTION_API_KEY')
  }
  const provided = request.headers.get('x-selection-api-key')
  return provided === expected
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  })
}

const handleSelectModel = httpAction(async (ctx, request) => {
  if (!verifySelectionApiKey(request)) {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  try {
    const result = await ctx.runMutation(api.modelSelection.selectModel, payload as never)
    return jsonResponse(200, result)
  } catch (error) {
    return jsonResponse(400, {
      error: error instanceof Error ? error.message : 'Failed to select model',
    })
  }
})

const handleReportOutcome = httpAction(async (ctx, request) => {
  if (!verifySelectionApiKey(request)) {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' })
  }

  try {
    const result = await ctx.runMutation(api.modelSelection.reportOutcome, payload as never)
    return jsonResponse(200, result)
  } catch (error) {
    return jsonResponse(400, {
      error: error instanceof Error ? error.message : 'Failed to report outcome',
    })
  }
})

const handleClerkWebhook = httpAction(async (ctx, request) => {
  const event = await validateRequest(request)
  if (!event) {
    return new Response('Error occured', {
      status: 400,
    })
  }
  switch (event.type) {
    case 'user.created': // intentional fallthrough
    case 'user.updated': {
      const existingUser = await ctx.runQuery(internal.users.getUser, {
        subject: event.data.id,
      })
      if (existingUser && event.type === 'user.created') {
        console.warn('Overwriting user', event.data.id, 'with', event.data)
      }
      console.log('creating/updating user', event.data.id)
      await ctx.runMutation(internal.users.updateOrCreateUser, {
        clerkUser: event.data,
      })
      break
    }
    case 'user.deleted': {
      // Clerk docs say this is required, but the types say optional?
      const id = event.data.id!
      await ctx.runMutation(internal.users.deleteUser, { id })
      break
    }
    default: {
      console.log('ignored Clerk webhook event', event.type)
    }
  }
  return new Response(null, {
    status: 200,
  })
})

function redirectTo(path: string) {
  return new Response(null, {
    status: 302,
    headers: {
      location: path,
    },
  })
}

function buildOAuthErrorRedirect(redirectToPath: string, provider: string, error: string) {
  const url = new URL(redirectToPath, 'https://placeholder.local')
  url.searchParams.set('integration', 'error')
  url.searchParams.set('provider', provider)
  url.searchParams.set('message', error)
  return `${url.pathname}${url.search}${url.hash}`
}

const handleOAuthStart = (provider: 'github' | 'google') =>
  httpAction(async () => {
    return jsonResponse(400, {
      error: `Use integrations.getOAuthStartUrl to begin ${provider} OAuth`,
    })
  })

const handleOAuthCallback = (provider: 'github' | 'google') =>
  httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const state = url.searchParams.get('state')?.trim()
    const code = url.searchParams.get('code')?.trim()
    const oauthError = url.searchParams.get('error')?.trim()

    if (!state) {
      return jsonResponse(400, { error: 'Missing OAuth state' })
    }

    const stateData = await ctx.runMutation(internal.integrations.consumeOAuthState, {
      provider,
      state,
    })

    if (!stateData) {
      return jsonResponse(400, { error: 'OAuth state is invalid or expired' })
    }

    if (oauthError) {
      return redirectTo(buildOAuthErrorRedirect(stateData.redirectTo, provider, oauthError))
    }

    if (!code) {
      return redirectTo(
        buildOAuthErrorRedirect(stateData.redirectTo, provider, 'missing_authorization_code'),
      )
    }

    try {
      const result = await ctx.runAction(internal.integrations.exchangeOAuthCode, {
        provider,
        code,
      })

      await ctx.runMutation(internal.integrations.upsertOAuthConnection, {
        userId: stateData.userId,
        provider: result.provider,
        accountSubject: result.accountSubject,
        accountLabel: result.accountLabel,
        scopes: result.scopes,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      })

      const doneUrl = new URL(stateData.redirectTo, 'https://placeholder.local')
      doneUrl.searchParams.set('integration', 'connected')
      doneUrl.searchParams.set('provider', provider)
      return redirectTo(`${doneUrl.pathname}${doneUrl.search}${doneUrl.hash}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'oauth_callback_failed'
      return redirectTo(buildOAuthErrorRedirect(stateData.redirectTo, provider, message))
    }
  })

const http = httpRouter()
registerRoutes(http, components.stripe, {
  webhookPath: '/stripe/webhook',
})

http.route({
  path: '/clerk-users-webhook',
  method: 'POST',
  handler: handleClerkWebhook,
})

http.route({
  path: '/v1/select-model',
  method: 'POST',
  handler: handleSelectModel,
})

http.route({
  path: '/v1/report-outcome',
  method: 'POST',
  handler: handleReportOutcome,
})

http.route({
  path: '/oauth/github/start',
  method: 'GET',
  handler: handleOAuthStart('github'),
})

http.route({
  path: '/oauth/github/callback',
  method: 'GET',
  handler: handleOAuthCallback('github'),
})

http.route({
  path: '/oauth/google/start',
  method: 'GET',
  handler: handleOAuthStart('google'),
})

http.route({
  path: '/oauth/google/callback',
  method: 'GET',
  handler: handleOAuthCallback('google'),
})

async function validateRequest(req: Request): Promise<WebhookEvent | undefined> {
  const payloadString = await req.text()

  const svixHeaders = {
    'svix-id': req.headers.get('svix-id')!,
    'svix-timestamp': req.headers.get('svix-timestamp')!,
    'svix-signature': req.headers.get('svix-signature')!,
  }
  const wh = new Webhook(webhookSecret)
  let evt: Event | null = null
  try {
    evt = wh.verify(payloadString, svixHeaders) as Event
  } catch (_) {
    console.log('error verifying')
    return
  }

  return evt as unknown as WebhookEvent
}

export default http
