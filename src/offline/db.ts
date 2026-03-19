import Dexie, { type Table } from 'dexie'
import type {
  OfflineDraftRecord,
  OfflineMessageRecord,
  OfflineModelRecord,
  OfflineProjectRecord,
  OfflineSessionSnapshot,
  OfflineSettingsRecord,
  OfflineThreadRecord,
} from './schema'

class OfflineDatabase extends Dexie {
  session!: Table<OfflineSessionSnapshot, string>
  threads!: Table<OfflineThreadRecord, string>
  messages!: Table<OfflineMessageRecord, string>
  models!: Table<OfflineModelRecord, string>
  projects!: Table<OfflineProjectRecord, string>
  settings!: Table<OfflineSettingsRecord, string>
  drafts!: Table<OfflineDraftRecord, string>

  constructor() {
    super('salemkode-chat-offline')
    this.version(4).stores({
      session: 'id, userId, lastSyncedAt',
      threads:
        'id, projectId, updatedAt, lastMessageAt, pinned, deletedAt, version',
      messages: 'id, threadId, updatedAt, deletedAt, version',
      models: 'id, modelId, sortOrder, isFavorite',
      projects: 'id, updatedAt, threadCount',
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
      offlineDb.projects,
      offlineDb.settings,
      offlineDb.drafts,
    ],
    async () => {
      await Promise.all([
        offlineDb.session.clear(),
        offlineDb.threads.clear(),
        offlineDb.messages.clear(),
        offlineDb.models.clear(),
        offlineDb.projects.clear(),
        offlineDb.settings.clear(),
        offlineDb.drafts.clear(),
      ])
    },
  )
}
