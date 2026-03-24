import type { ModelDialogItem } from './model-dialog.types'

export function sortModelDialogItems(models: ModelDialogItem[]) {
  return [...models].sort((a, b) => {
    if (Number(b.isFavorite) !== Number(a.isFavorite)) {
      return Number(b.isFavorite) - Number(a.isFavorite)
    }
    return a.displayName.localeCompare(b.displayName)
  })
}
