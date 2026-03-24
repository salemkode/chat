const LOCAL_THREAD_PREFIX = 'local-thread-'

export function createLocalThreadId() {
  return `${LOCAL_THREAD_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function isLocalThreadId(threadId?: string | null) {
  return Boolean(threadId && threadId.startsWith(LOCAL_THREAD_PREFIX))
}
