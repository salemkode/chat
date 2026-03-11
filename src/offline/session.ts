import { clearOfflineDatabase, offlineDb } from './db'
import type {
  OfflineDraftRecord,
  OfflineSessionSnapshot,
  OfflineUiState,
} from './schema'

const SESSION_ID = 'current'
const SETTINGS_ID = 'current'

export async function storeTrustedSession(
  session: Omit<OfflineSessionSnapshot, 'id'>,
) {
  await offlineDb.session.put({
    id: SESSION_ID,
    ...session,
  })
}

export async function loadTrustedSession() {
  return offlineDb.session.get(SESSION_ID)
}

export async function clearOfflineSession() {
  await clearOfflineDatabase()

  if (typeof caches !== 'undefined') {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((key) => key.startsWith('salemkode-chat'))
        .map((key) => caches.delete(key)),
    )
  }
}

export async function saveDraft(threadId: string, value: string) {
  const record: OfflineDraftRecord = {
    threadId,
    value,
    updatedAt: Date.now(),
  }

  if (!value.trim()) {
    await offlineDb.drafts.delete(threadId)
    return
  }

  await offlineDb.drafts.put(record)
}

export async function loadDraft(threadId: string) {
  return offlineDb.drafts.get(threadId)
}

export async function clearDraft(threadId: string) {
  await offlineDb.drafts.delete(threadId)
}

export async function updateOfflineUiState(state: OfflineUiState) {
  await offlineDb.syncMeta.put({
    key: 'ui_state',
    version: state.lastSyncAt ?? 0,
    updatedAt: Date.now(),
  })
}

export async function setLastSyncAt(lastSyncAt: number) {
  const session = await loadTrustedSession()
  if (!session) return

  await storeTrustedSession({
    ...session,
    lastSyncedAt: lastSyncAt,
  })
}

export function getSettingsStorageId() {
  return SETTINGS_ID
}

export async function estimateOfflineStorageUsage() {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null
  }

  return navigator.storage.estimate()
}
