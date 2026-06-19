import {
  siAnthropic,
  siDeepseek,
  siGoogle,
  siGooglegemini,
  siMeta,
  siMistralai,
  siOpenrouter,
  siPerplexity,
  siQwen,
  siReplicate,
  siX,
} from 'simple-icons'
import { isProviderType, type IconType, type ProviderType } from './admin-types'

export const BRAND_ICONS = {
  anthropic: { hex: siAnthropic.hex, path: siAnthropic.path, title: siAnthropic.title },
  deepseek: { hex: siDeepseek.hex, path: siDeepseek.path, title: siDeepseek.title },
  google: { hex: siGoogle.hex, path: siGoogle.path, title: siGoogle.title },
  googlegemini: {
    hex: siGooglegemini.hex,
    path: siGooglegemini.path,
    title: siGooglegemini.title,
  },
  meta: { hex: siMeta.hex, path: siMeta.path, title: siMeta.title },
  mistralai: { hex: siMistralai.hex, path: siMistralai.path, title: siMistralai.title },
  openrouter: { hex: siOpenrouter.hex, path: siOpenrouter.path, title: siOpenrouter.title },
  perplexity: { hex: siPerplexity.hex, path: siPerplexity.path, title: siPerplexity.title },
  qwen: { hex: siQwen.hex, path: siQwen.path, title: siQwen.title },
  replicate: { hex: siReplicate.hex, path: siReplicate.path, title: siReplicate.title },
  x: { hex: siX.hex, path: siX.path, title: 'xAI / X' },
} satisfies Record<string, { hex: string; path: string; title: string }>

export type BrandIconName = keyof typeof BRAND_ICONS

export const BRAND_ICON_NAMES = [
  'anthropic',
  'deepseek',
  'google',
  'googlegemini',
  'meta',
  'mistralai',
  'openrouter',
  'perplexity',
  'qwen',
  'replicate',
  'x',
] satisfies BrandIconName[]

const BRAND_ICON_ALIASES: Record<string, BrandIconName> = {
  anthropic: 'anthropic',
  claude: 'anthropic',
  deepseek: 'deepseek',
  gemini: 'googlegemini',
  google: 'google',
  googlegemini: 'googlegemini',
  llama: 'meta',
  meta: 'meta',
  mistral: 'mistralai',
  mistralai: 'mistralai',
  openrouter: 'openrouter',
  perplexity: 'perplexity',
  qwen: 'qwen',
  replicate: 'replicate',
  x: 'x',
  xai: 'x',
}

const MODEL_BRAND_MATCHERS: Array<{ icon: BrandIconName; match: RegExp }> = [
  { icon: 'googlegemini', match: /\bgemini\b/i },
  { icon: 'anthropic', match: /\bclaude\b/i },
  { icon: 'x', match: /\bgrok\b/i },
  { icon: 'deepseek', match: /\bdeepseek\b/i },
  { icon: 'qwen', match: /\bqwen\b/i },
  { icon: 'meta', match: /\bllama\b/i },
  { icon: 'mistralai', match: /\bmistral\b/i },
  { icon: 'perplexity', match: /\bperplexity\b/i },
  { icon: 'replicate', match: /\breplicate\b/i },
]

const PROVIDER_BRAND_MAP: Partial<Record<ProviderType, BrandIconName>> = {
  anthropic: 'anthropic',
  deepseek: 'deepseek',
  google: 'google',
  mistral: 'mistralai',
  openrouter: 'openrouter',
  perplexity: 'perplexity',
  qwen: 'qwen',
  replicate: 'replicate',
  xai: 'x',
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function getBrandIcon(name: BrandIconName) {
  return BRAND_ICONS[name]
}

export function parseBrandIconName(value: string | undefined | null): BrandIconName | undefined {
  if (!value) {
    return undefined
  }

  const exact = value.trim().toLowerCase()
  if (Object.prototype.hasOwnProperty.call(BRAND_ICONS, exact)) {
    return BRAND_ICON_NAMES.find((iconName) => iconName === exact)
  }

  return BRAND_ICON_ALIASES[normalizeKey(value)]
}

export function inferBrandIconName(args: {
  icon?: string | null
  iconType?: IconType | null
  providerType?: string | null
  modelId?: string | null
  displayName?: string | null
  name?: string | null
}): BrandIconName | undefined {
  if (args.iconType === 'brand') {
    return parseBrandIconName(args.icon)
  }

  for (const candidate of [args.modelId, args.displayName, args.name]) {
    const value = candidate?.trim()
    if (!value) {
      continue
    }

    const aliased = parseBrandIconName(value)
    if (aliased) {
      return aliased
    }

    for (const matcher of MODEL_BRAND_MATCHERS) {
      if (matcher.match.test(value)) {
        return matcher.icon
      }
    }
  }

  const providerType = args.providerType?.trim()
  if (!providerType) {
    return undefined
  }

  if (isProviderType(providerType)) {
    return PROVIDER_BRAND_MAP[providerType]
  }

  return parseBrandIconName(providerType)
}
