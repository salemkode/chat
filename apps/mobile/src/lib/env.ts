export function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export const mobileEnv = {
  convexUrl: getRequiredEnv('EXPO_PUBLIC_CONVEX_URL'),
  clerkPublishableKey: getRequiredEnv('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY'),
}
