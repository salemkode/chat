import { ModelPickerDialog } from './dialog'
import type {
  ModelDialogCollection,
  ModelDialogItem,
} from './dialog/model-dialog.types'

type Props = {
  visible: boolean
  models: ModelDialogItem[]
  collections: ModelDialogCollection[]
  selectedModelId: string | null
  onClose: () => void
  onSelect: (modelId: string) => void
  onToggleFavorite: (modelId: string, isFavorite: boolean) => void
  offline: boolean
}

export function ModelPickerModal(props: Props) {
  return <ModelPickerDialog {...props} />
}
