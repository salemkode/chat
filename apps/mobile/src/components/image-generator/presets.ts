import type { ImageRatioOption, ImageStyleOption } from './types'

export const IMAGE_RATIO_OPTIONS: ImageRatioOption[] = [
  { id: 'square', label: 'Square', width: 1, height: 1 },
  { id: 'landscape', label: 'Landscape', width: 1.35, height: 0.82 },
  { id: 'portrait', label: 'Portrait', width: 0.78, height: 1.18 },
  { id: 'custom', label: 'Custom', width: 1, height: 1 },
]

export const IMAGE_STYLE_OPTIONS: ImageStyleOption[] = [
  { id: 'none', label: 'No Style', artwork: 'none' },
  { id: 'realistic', label: 'Realistic', artwork: 'realistic' },
  { id: 'anime', label: 'Anime', artwork: 'anime' },
  { id: 'three-d', label: '3D', artwork: 'three-d' },
  { id: 'editorial', label: 'Editorial', artwork: 'editorial' },
  { id: 'landscape', label: 'Landscape', artwork: 'landscape' },
  { id: 'portrait', label: 'Portrait', artwork: 'portrait' },
  { id: 'cinematic', label: 'Cinematic', artwork: 'cinematic' },
]
