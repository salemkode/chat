/** Shared optimistic thread row helpers for Convex `listThreadsWithMetadata` patches. */

export const OPTIMISTIC_THREAD_PREFIX = 'optimistic-thread-'

export function normalizeOptimisticThreadTitle(title?: string) {
  const cleaned = title?.trim()
  return cleaned ? cleaned.slice(0, 60) : 'New chat'
}

export function buildOptimisticThreadId(args: { clientThreadKey?: string; now: number }) {
  return `${OPTIMISTIC_THREAD_PREFIX}${args.clientThreadKey?.trim() || args.now}`
}

export function isOptimisticThreadId(threadId?: string | null) {
  return Boolean(threadId && threadId.startsWith(OPTIMISTIC_THREAD_PREFIX))
}
