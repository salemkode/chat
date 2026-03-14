import Dexie, { type Table } from 'dexie'
import type {
  OfflineDraftRecord,
  OfflineMessageRecord,
  OfflineModelRecord,
  OfflineSessionSnapshot,
  OfflineSettingsRecord,
  OfflineThreadRecord,
} from './schema'

class OfflineDatabase extends Dexie {
  session!: Table<OfflineSessionSnapshot, string>
  threads!: Table<OfflineThreadRecord, string>
  messages!: Table<OfflineMessageRecord, string>
  models!: Table<OfflineModelRecord, string>
  settings!: Table<OfflineSettingsRecord, string>
  drafts!: Table<OfflineDraftRecord, string>

  constructor() {
    super('salemkode-chat-offline')
    this.version(1).stores({
      session: 'id, userId, lastSyncedAt',
      threads: 'id, updatedAt, lastMessageAt, pinned, deletedAt, version',
      messages: 'id, threadId, updatedAt, deletedAt, version',
      models: 'id, modelId, sortOrder, isFavorite',
      settings: 'id, updatedAt',
      drafts: 'threadId, updatedAt',
    })
  }
}

export const offlineDb = new OfflineDatabase()

export async function clearOfflineDatabase() {
  await offlineDb.transaction(
    'rw',
    [
      offlineDb.session,
      offlineDb.threads,
      offlineDb.messages,
      offlineDb.models,
      offlineDb.settings,
      offlineDb.drafts,
    ],
    async () => {
      await Promise.all([
        offlineDb.session.clear(),
        offlineDb.threads.clear(),
        offlineDb.messages.clear(),
        offlineDb.models.clear(),
        offlineDb.settings.clear(),
        offlineDb.drafts.clear(),
      ])
    },
  )
}
