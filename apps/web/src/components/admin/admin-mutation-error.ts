import { ConvexError } from 'convex/values'

/** Long enough to read multi-line Convex validation / server errors in admin toasts. */
export const ADMIN_MUTATION_ERROR_TOAST_DURATION_MS = 12_000

export function formatAdminMutationError(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof ConvexError) {
    const parts: string[] = [error.message]
    const data = error.data
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const record = data as Record<string, unknown>
      const serialized = JSON.stringify(record)
      if (serialized !== '{}' && !error.message.includes(serialized)) {
        parts.push(serialized)
      }
    } else if (typeof data === 'string' && data !== error.message) {
      parts.push(data)
    }
    return parts.join('\n')
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return fallback
}
