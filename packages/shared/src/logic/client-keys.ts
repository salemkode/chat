const CLIENT_THREAD_KEY_PREFIX = 'client-thread-'
const CLIENT_REQUEST_ID_PREFIX = 'client-req-'

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10)
}

export function createClientThreadKey() {
  return `${CLIENT_THREAD_KEY_PREFIX}${Date.now()}-${randomSuffix()}`
}

export function createClientRequestId() {
  return `${CLIENT_REQUEST_ID_PREFIX}${Date.now()}-${randomSuffix()}`
}

export function isClientThreadKey(value?: string | null) {
  return Boolean(value && value.startsWith(CLIENT_THREAD_KEY_PREFIX))
}

