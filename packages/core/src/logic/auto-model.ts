export const AUTO_MODEL_ID = 'auto'

const AUTO_MODEL_COLLECTION_PREFIX = 'auto:collection:'

export function isAutoModelSelection(modelId?: string | null) {
  if (!modelId) {
    return false
  }
  return modelId === AUTO_MODEL_ID || modelId.startsWith(AUTO_MODEL_COLLECTION_PREFIX)
}

export function encodeAutoModelCollectionSelection(collectionId: string) {
  return `${AUTO_MODEL_COLLECTION_PREFIX}${collectionId}`
}

export function parseAutoModelCollectionSelection(modelId?: string | null) {
  if (!modelId) {
    return null
  }
  if (!modelId.startsWith(AUTO_MODEL_COLLECTION_PREFIX)) {
    return null
  }
  const collectionId = modelId.slice(AUTO_MODEL_COLLECTION_PREFIX.length).trim()
  return collectionId.length > 0 ? collectionId : null
}
