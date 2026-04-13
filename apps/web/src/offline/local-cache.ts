import type { OfflineSessionSnapshot, OfflineSettingsRecord } from './schema'

const STORAGE_NS = 'salemkode-chat'
const SCHEMA_VERSION = 1

const LEGACY_IDB_NAME = 'salemkode-chat-offline'

let cacheVersion = 0
const listeners = new Set<() => void>()

export function subscribeOfflineCache(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function notifyOfflineCacheUpdate() {
  cacheVersion += 1
  for (const cb of listeners) {
    cb()
  }
}

export function getOfflineCacheVersion() {
  return cacheVersion
}

function userKey(userId: string, suffix: string) {
  return `${STORAGE_NS}:v${SCHEMA_VERSION}:u:${userId}:${suffix}`
}

function readJson<T>(raw: string | null): T | null {
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** Best-effort removal of legacy Dexie DB after migrating off IndexedDB. */
export function deleteLegacyOfflineIndexedDb() {
  if (typeof indexedDB === 'undefined') {
    return
  }
  try {
    indexedDB.deleteDatabase(LEGACY_IDB_NAME)
  } catch {
    // ignore
  }
}

const SESSION_STORAGE_KEY = `${STORAGE_NS}:v${SCHEMA_VERSION}:session`

export function readSession(): OfflineSessionSnapshot | null {
  if (typeof window === 'undefined') {
    return null
  }
  const parsed = readJson<OfflineSessionSnapshot>(localStorage.getItem(SESSION_STORAGE_KEY))
  if (!parsed || typeof parsed.userId !== 'string' || !parsed.trusted) {
    return null
  }
  return parsed
}

export function storeTrustedSession(session: Omit<OfflineSessionSnapshot, 'id'>) {
  if (typeof window === 'undefined') {
    return
  }
  const payload: OfflineSessionSnapshot = {
    id: 'current',
    ...session,
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload))
  notifyOfflineCacheUpdate()
}

export function readSettings(): OfflineSettingsRecord | null {
  if (typeof window === 'undefined') {
    return null
  }
  const session = readSession()
  if (!session) {
    return null
  }
  const parsed = readJson<OfflineSettingsRecord>(
    localStorage.getItem(userKey(session.userId, 'settings')),
  )
  if (!parsed || parsed.id !== 'current') {
    return null
  }
  return parsed
}

export function writeSettingsForUser(userId: string, record: Omit<OfflineSettingsRecord, 'id'>) {
  if (typeof window === 'undefined') {
    return
  }
  const payload: OfflineSettingsRecord = { id: 'current', ...record }
  localStorage.setItem(userKey(userId, 'settings'), JSON.stringify(payload))
  notifyOfflineCacheUpdate()
}

export function writeThreadsCache(userId: string, threads: unknown) {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(userKey(userId, 'threads'), JSON.stringify(threads))
  notifyOfflineCacheUpdate()
}

export function readThreadsCache<T>(userId: string): T | null {
  if (typeof window === 'undefined') {
    return null
  }
  return readJson<T>(localStorage.getItem(userKey(userId, 'threads')))
}

export function writeModelsCache(userId: string, models: unknown) {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(userKey(userId, 'models'), JSON.stringify(models))
  notifyOfflineCacheUpdate()
}

export function readModelsCache<T>(userId: string): T | null {
  if (typeof window === 'undefined') {
    return null
  }
  return readJson<T>(localStorage.getItem(userKey(userId, 'models')))
}

export function writeProjectsCache(userId: string, projects: unknown) {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(userKey(userId, 'projects'), JSON.stringify(projects))
  notifyOfflineCacheUpdate()
}

export function readProjectsCache<T>(userId: string): T | null {
  if (typeof window === 'undefined') {
    return null
  }
  return readJson<T>(localStorage.getItem(userKey(userId, 'projects')))
}

export function writeMessagesCache(userId: string, threadId: string, messages: unknown) {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(userKey(userId, `messages:${threadId}`), JSON.stringify(messages))
  notifyOfflineCacheUpdate()
}

export function readMessagesCache<T>(userId: string, threadId: string): T | null {
  if (typeof window === 'undefined') {
    return null
  }
  return readJson<T>(localStorage.getItem(userKey(userId, `messages:${threadId}`)))
}

export function clearLocalOfflineCache() {
  if (typeof window === 'undefined') {
    return
  }
  const prefix = `${STORAGE_NS}:v${SCHEMA_VERSION}:`
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith(prefix)) {
      keysToRemove.push(key)
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }
  notifyOfflineCacheUpdate()
}
