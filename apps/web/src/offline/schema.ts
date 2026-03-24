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
  title?: string
  emoji: string
  icon?: string
  projectId?: string
  projectName?: string
  sortOrder: number
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
  status?: 'success' | 'streaming' | 'failed'
  failureKind?: 'stopped' | 'error'
  failureMode?: 'replace' | 'clarify'
  failureNote?: string
}

export interface OfflineModelRecord {
  id: string
  modelId: string
  displayName: string
  description?: string
  capabilities?: string[]
  supportsReasoning?: boolean
  reasoningLevels?: Array<'low' | 'medium' | 'high'>
  defaultReasoningLevel?: 'off' | 'low' | 'medium' | 'high'
  sortOrder: number
  isFavorite: boolean
  isFree?: boolean
  icon?: string
  iconType?: 'emoji' | 'lucide' | 'upload'
  iconUrl?: string
  provider?: {
    _id: string
    name: string
    providerType: string
    icon?: string
    iconType?: 'emoji' | 'lucide' | 'upload'
    iconId?: string
    iconUrl?: string
  } | null
}

export interface OfflineProjectRecord {
  id: string
  name: string
  description?: string
  threadCount: number
  createdAt: number
  updatedAt: number
}

export interface OfflineSettingsRecord {
  id: 'current'
  displayName?: string
  image?: string
  bio?: string
  reasoningEnabled?: boolean
  reasoningLevel?: 'low' | 'medium' | 'high'
  updatedAt: number
}

export interface OfflineDraftRecord {
  threadId: string
  value: string
  updatedAt: number
}
