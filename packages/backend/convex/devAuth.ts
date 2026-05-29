'use node'

import { createClerkClient } from '@clerk/backend'
import { v } from 'convex/values'
import { action } from './_generated/server'

function devMobileSignInEmails(): string[] {
  const list = process.env.DEV_MOBILE_SIGN_IN_EMAILS?.trim()
  if (list) {
    return list
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0)
  }

  const single = process.env.DEV_MOBILE_SIGN_IN_EMAIL?.trim()
  if (single) {
    return [single]
  }

  throw new Error(
    'Missing DEV_MOBILE_SIGN_IN_EMAILS (or DEV_MOBILE_SIGN_IN_EMAIL) in the Convex deployment.',
  )
}

function clerkSecretKey(): string {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim()
  if (!secretKey) {
    throw new Error('Missing CLERK_SECRET_KEY in the Convex deployment.')
  }
  return secretKey
}

function assertDevMobileSignInEnabled() {
  if (process.env.DEV_MOBILE_SIGN_IN_ENABLED !== 'true') {
    throw new Error('Dev mobile sign-in is disabled for this Convex deployment.')
  }
}

function assertAllowedDevEmail(email: string) {
  const allowedEmails = devMobileSignInEmails()
  if (!allowedEmails.includes(email)) {
    throw new Error('Email is not allowed for dev mobile sign-in.')
  }
}

export const createMobileDevSignInTicket = action({
  args: {
    email: v.string(),
  },
  returns: v.object({
    ticket: v.string(),
  }),
  handler: async (_ctx, args) => {
    assertDevMobileSignInEnabled()

    const email = args.email.trim()
    if (!email) {
      throw new Error('Email is required.')
    }
    assertAllowedDevEmail(email)

    const clerk = createClerkClient({ secretKey: clerkSecretKey() })
    const users = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    })
    const user = users.data[0]
    if (!user) {
      throw new Error(`No Clerk user found for ${email}.`)
    }

    const signInToken = await clerk.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 60,
    })

    return { ticket: signInToken.token }
  },
})
