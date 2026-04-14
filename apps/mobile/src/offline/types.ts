export interface MobileOfflineSessionSnapshot {
  id: 'current'
  userId: string
  name?: string
  email?: string
  image?: string
  trusted: boolean
  lastSyncedAt?: number
  schemaVersion: number
}

export interface MobileOfflineThreadRecord {
  id: string
  title?: string
  projectId?: string
  projectName?: string
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export interface MobileOfflineMessageRecord {
  id: string
  threadId: string
  role: 'user' | 'assistant'
  text: string
  attachments?: Array<{
    kind: 'image' | 'file'
    url: string
    mediaType: string
    filename?: string
  }>
  status?: 'success' | 'streaming' | 'failed'
  createdAt: number
}

export interface MobileOfflineModelRecord {
  id: string
  modelId: string
  displayName: string
  description?: string
  capabilities?: string[]
  supportedAttachmentMediaTypes?: string[]
  attachmentValidationStatus?: 'pending' | 'valid' | 'invalid'
  sortOrder: number
  isFavorite: boolean
}

export interface MobileOfflineProjectRecord {
  id: string
  name: string
  description?: string
  threadCount: number
  createdAt: number
  updatedAt: number
}

export interface MobileOfflineSettingsRecord {
  id: 'current'
  displayName?: string
  image?: string
  bio?: string
  updatedAt: number
}

export interface MobileOfflineDraftRecord {
  threadId: string
  value: string
  updatedAt: number
}
