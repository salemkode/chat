import * as DocumentPicker from 'expo-document-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'

export type LocalAsset = {
  uri: string
  name: string
  mimeType: string
  width?: number
  height?: number
  sizeBytes?: number
}

export async function uriToBlob(uri: string) {
  const res = await fetch(uri)
  return await res.blob()
}

const IMAGE_TARGET_BYTES = 500 * 1024
const IMAGE_MAX_DIMENSION = 1600
const IMAGE_MIN_DIMENSION = 320
const IMAGE_START_QUALITY = 0.82
const IMAGE_MIN_QUALITY = 0.45
const IMAGE_MAX_ITERATIONS = 4

function replaceFileExtension(name: string, extension: string) {
  const normalized = name.trim() || 'image'
  return normalized.replace(/\.[^./]+$/, '') + extension
}

async function getBlobSize(uri: string) {
  const blob = await uriToBlob(uri)
  return blob.size
}

async function compressImageAttachment(
  asset: ImagePicker.ImagePickerAsset,
  index: number,
): Promise<LocalAsset> {
  const fallbackName = asset.fileName ?? `image-${index}.jpg`
  const original: LocalAsset = {
    uri: asset.uri,
    name: fallbackName,
    mimeType: asset.mimeType ?? 'image/jpeg',
    width: asset.width,
    height: asset.height,
    sizeBytes: asset.fileSize,
  }

  try {
    let width = asset.width ?? IMAGE_MAX_DIMENSION
    let height = asset.height ?? IMAGE_MAX_DIMENSION
    const maxDimension = Math.max(width, height)
    if (maxDimension > IMAGE_MAX_DIMENSION) {
      const scale = IMAGE_MAX_DIMENSION / maxDimension
      width = Math.max(Math.round(width * scale), IMAGE_MIN_DIMENSION)
      height = Math.max(Math.round(height * scale), IMAGE_MIN_DIMENSION)
    }

    let currentUri = asset.uri
    let currentWidth = width
    let currentHeight = height
    let quality = IMAGE_START_QUALITY
    let best: LocalAsset | null = null

    for (let iteration = 0; iteration < IMAGE_MAX_ITERATIONS; iteration += 1) {
      const context = ImageManipulator.manipulate(currentUri)
      context.resize({
        width: currentWidth,
        height: currentHeight,
      })
      const rendered = await context.renderAsync()
      const saved = await rendered.saveAsync({
        compress: quality,
        format: SaveFormat.JPEG,
      })
      const sizeBytes = await getBlobSize(saved.uri)
      best = {
        uri: saved.uri,
        name: replaceFileExtension(fallbackName, '.jpg'),
        mimeType: 'image/jpeg',
        width: saved.width,
        height: saved.height,
        sizeBytes,
      }

      if (sizeBytes <= IMAGE_TARGET_BYTES) {
        return best
      }

      currentUri = saved.uri
      currentWidth = Math.max(Math.round(saved.width * 0.85), IMAGE_MIN_DIMENSION)
      currentHeight = Math.max(Math.round(saved.height * 0.85), IMAGE_MIN_DIMENSION)
      quality = Math.max(quality - 0.12, IMAGE_MIN_QUALITY)
    }

    return best ?? original
  } catch (error) {
    console.warn('[attachments] Failed to compress image before upload', error)
    return original
  }
}

export async function pickImageAttachments(): Promise<LocalAsset[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 1,
  })
  if (result.canceled) {
    return []
  }
  return await Promise.all(
    result.assets.map((asset, index) => compressImageAttachment(asset, index)),
  )
}

export async function pickDocumentAttachments(): Promise<LocalAsset[]> {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    type: ['application/pdf', 'image/*'],
  })
  if (result.canceled) {
    return []
  }
  return result.assets.map((asset) => ({
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
    sizeBytes: asset.size,
  }))
}
