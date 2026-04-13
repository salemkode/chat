export type ModelDialogItem = {
  id: string
  modelId: string
  displayName: string
  description?: string
  capabilities?: string[]
  isFavorite: boolean
}

export type ModelPickerDialogProps = {
  visible: boolean
  models: ModelDialogItem[]
  selectedModelId: string | null
  onClose: () => void
  onSelect: (modelId: string) => void
  onToggleFavorite: (modelId: string, isFavorite: boolean) => void
  offline: boolean
}
