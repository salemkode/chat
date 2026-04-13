import { AUTO_MODEL_ID } from '@chat/shared'
import type { ModelDialogItem } from './model-dialog.types'

const CAPABILITY_LABELS: Record<string, string> = {
  vision: 'Vision',
  image: 'Image',
  images: 'Images',
  multimodal: 'Multimodal',
  'multi-modal': 'Multimodal',
  attachment: 'Attachment',
  attachments: 'Attachments',
  file: 'File',
  files: 'Files',
  document: 'Document',
  documents: 'Documents',
  pdf: 'PDF',
  reasoning: 'Reasoning',
  code: 'Code',
  tools: 'Tools',
  audio: 'Audio',
}

export function sortModelDialogItems(models: ModelDialogItem[]) {
  return [...models].sort((a, b) => {
    if (a.modelId === AUTO_MODEL_ID || b.modelId === AUTO_MODEL_ID) {
      return a.modelId === AUTO_MODEL_ID ? -1 : 1
    }
    if (Number(b.isFavorite) !== Number(a.isFavorite)) {
      return Number(b.isFavorite) - Number(a.isFavorite)
    }
    return a.displayName.localeCompare(b.displayName)
  })
}

export function getModelCapabilityLabels(capabilities?: string[]): string[] {
  if (!Array.isArray(capabilities)) {
    return []
  }

  const normalized = capabilities
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)

  const labels = normalized.map((value) => CAPABILITY_LABELS[value] ?? value)
  return [...new Set(labels)]
}
