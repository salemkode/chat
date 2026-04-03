import type { LocalAsset } from '../../mobile-data/attachments'

export type RatioId = 'square' | 'landscape' | 'portrait' | 'custom'
export type StyleId =
  | 'none'
  | 'realistic'
  | 'anime'
  | 'three-d'
  | 'editorial'
  | 'landscape'
  | 'portrait'
  | 'cinematic'

export type ImageRatioOption = {
  id: RatioId
  label: string
  width: number
  height: number
}

export type ImageStyleOption = {
  id: StyleId
  label: string
  artwork: StyleId
}

export type GeneratedConcept = {
  id: string
  prompt: string
  ratioLabel: string
  styleLabel: string
  createdAt: string
  attachments: LocalAsset[]
}
