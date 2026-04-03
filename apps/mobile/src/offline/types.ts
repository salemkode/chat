import type { QuranAyahCardData } from '@chat/shared/quran-ayah'

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
  ayahCard?: QuranAyahCardData
  status?: 'success' | 'streaming' | 'failed'
  createdAt: number
}

export interface MobileOfflineModelRecord {
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
  iconType?: 'emoji' | 'lucide' | 'phosphor' | 'upload'
  iconUrl?: string
  provider?: {
    _id: string
    name: string
    providerType: string
    icon?: string
    iconType?: 'emoji' | 'lucide' | 'phosphor' | 'upload'
    iconId?: string
    iconUrl?: string
  } | null
}

export interface MobileOfflineModelCollectionRecord {
  id: string
  name: string
  description?: string
  sortOrder: number
  modelIds: string[]
  modelCount: number
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
