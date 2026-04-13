export const AUTO_MODEL_ID = 'auto'

export function isAutoModelSelection(modelId?: string | null) {
  return modelId === AUTO_MODEL_ID
}
