export type ModelDialogProvider = {
  _id: string
  name: string
  providerType: string
  icon?: string
  iconType?: 'emoji' | 'lucide' | 'phosphor' | 'upload'
  iconId?: string
  iconUrl?: string
}

export type ModelDialogItem = {
  id: string
  modelId: string
  displayName: string
  description?: string
  capabilities?: string[]
  sortOrder: number
  isFavorite: boolean
  provider?: ModelDialogProvider | null
  isFree?: boolean
  icon?: string
  iconType?: 'emoji' | 'lucide' | 'phosphor' | 'upload'
  iconUrl?: string
}

export type ModelDialogCollection = {
  id: string
  name: string
  description?: string
  sortOrder: number
  modelIds: string[]
  modelCount: number
}

export type ModelSidebarFilter =
  | { kind: 'favorites' }
  | { kind: 'collection'; id: string }
  | { kind: 'provider'; id: string }

export type ModelSidebarItem = {
  key: string
  filter: ModelSidebarFilter
  label: string
  description?: string
  count: number
  iconKind: 'favorites' | 'collection' | 'provider'
  provider?: ModelDialogProvider | null
}

export type ModelPickerDialogProps = {
  visible: boolean
  models: ModelDialogItem[]
  collections: ModelDialogCollection[]
  selectedModelId: string | null
  onClose: () => void
  onSelect: (modelId: string) => void
  onToggleFavorite: (modelId: string, isFavorite: boolean) => void
  offline: boolean
}
