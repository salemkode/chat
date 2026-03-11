export type OfflineMutationType =
  | 'settings'
  | 'favorite'
  | 'pinThread'
  | 'threadIcon'
  | 'deleteThread'

export interface OfflineSessionSnapshot {
  id: 'current'
  userId: string
  name?: string
  email?: string
  image?: string
  trusted: boolean
  lastSyncedAt?: number
  schemaVersion: number
}

export interface OfflineThreadRecord {
  id: string
  title: string
  emoji: string
  icon?: string
  pinned: boolean
  createdAt: number
  updatedAt: number
  lastMessageAt: number
  deletedAt?: number
  version: number
}

export interface OfflineMessageRecord {
  id: string
  threadId: string
  role: 'user' | 'assistant'
  text: string
  parts: Array<Record<string, unknown>>
  createdAt: number
  updatedAt: number
  deletedAt?: number
  version: number
  status?: 'done' | 'streaming'
}

export interface OfflineModelRecord {
  id: string
  modelId: string
  displayName: string
  description?: string
  sortOrder: number
  isFavorite: boolean
}

export interface OfflineSettingsRecord {
  id: 'current'
  displayName?: string
  image?: string
  bio?: string
  updatedAt: number
}

export interface OfflineDraftRecord {
  threadId: string
  value: string
  updatedAt: number
}

export interface OfflineOutboxItem {
  id?: number
  type: OfflineMutationType
  payload: Record<string, unknown>
  dedupeKey: string
  clientUpdatedAt: number
  createdAt: number
}

export interface SyncCheckpoint {
  key: string
  version: number
  updatedAt: number
}

export interface OfflineAssetRecord {
  url: string
  updatedAt: number
}

export interface OfflineUiState {
  isSyncing: boolean
  lastSyncAt?: number
  syncError?: string
}
