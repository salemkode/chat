type ProviderConfig = {
  organization?: string
  project?: string
  headers?: Record<string, string>
  queryParams?: Record<string, string>
}

export const PROVIDER_TYPES = [
  'openrouter',
  'openai',
  'anthropic',
  'google',
  'azure',
  'groq',
  'deepseek',
  'xai',
  'cerebras',
  'openai-compatible',
  'opencode',
  'mistral',
  'cohere',
  'perplexity',
  'fireworks',
  'together',
  'replicate',
  'moonshot',
  'qwen',
  'stepfun',
] as const

export type ProviderType = (typeof PROVIDER_TYPES)[number]

type DiscoveryMode =
  | 'openai-compatible'
  | 'openrouter'
  | 'anthropic'
  | 'google'
  | 'unsupported'

export interface DiscoveredModel {
  modelId: string
  displayName: string
  description?: string
  ownedBy?: string
  contextWindow?: number
  maxOutputTokens?: number
  modalities?: {
    input: string[]
    output: string[]
  }
}

export interface ProviderCatalogResult {
  ok: boolean
  fetchedAt: number
  providerType: ProviderType
  source: {
    discoveryMode: DiscoveryMode
    baseURL?: string
    endpoint?: string
    note?: string
  }
  modelCount: number
  models: DiscoveredModel[]
  error?: string
}

const PROVIDER_METADATA: Record<
  ProviderType,
  {
    label: string
    baseURL?: string
    discoveryMode: DiscoveryMode
    note?: string
  }
> = {
  openrouter: {
    label: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    discoveryMode: 'openrouter',
  },
  openai: {
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    discoveryMode: 'openai-compatible',
  },
  anthropic: {
    label: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    discoveryMode: 'anthropic',
  },
  google: {
    label: 'Google AI Studio',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    discoveryMode: 'google',
  },
  azure: {
    label: 'Azure OpenAI',
    discoveryMode: 'unsupported',
    note:
      'Azure OpenAI model discovery is deployment-based and not exposed by the same data-plane API used for chat requests.',
  },
  groq: {
    label: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    discoveryMode: 'openai-compatible',
  },
  deepseek: {
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    discoveryMode: 'openai-compatible',
  },
  xai: {
    label: 'xAI',
    baseURL: 'https://api.x.ai/v1',
    discoveryMode: 'openai-compatible',
  },
  cerebras: {
    label: 'Cerebras',
    baseURL: 'https://api.cerebras.ai/v1',
    discoveryMode: 'openai-compatible',
  },
  'openai-compatible': {
    label: 'OpenAI Compatible',
    discoveryMode: 'openai-compatible',
  },
  opencode: {
    label: 'OpenCode',
    baseURL: 'https://api.opencode.ai/v1',
    discoveryMode: 'openai-compatible',
  },
  mistral: {
    label: 'Mistral',
    baseURL: 'https://api.mistral.ai/v1',
    discoveryMode: 'openai-compatible',
  },
  cohere: {
    label: 'Cohere',
    baseURL: 'https://api.cohere.ai/v1',
    discoveryMode: 'openai-compatible',
  },
  perplexity: {
    label: 'Perplexity',
    baseURL: 'https://api.perplexity.ai',
    discoveryMode: 'openai-compatible',
  },
  fireworks: {
    label: 'Fireworks',
    baseURL: 'https://api.fireworks.ai/inference/v1',
    discoveryMode: 'openai-compatible',
  },
  together: {
    label: 'Together',
    baseURL: 'https://api.together.xyz/v1',
    discoveryMode: 'openai-compatible',
  },
  replicate: {
    label: 'Replicate',
    discoveryMode: 'unsupported',
    note:
      'Replicate does not expose the same chat-model listing shape used by the rest of this admin flow.',
  },
  moonshot: {
    label: 'Moonshot',
    baseURL: 'https://api.moonshot.cn/v1',
    discoveryMode: 'openai-compatible',
  },
  qwen: {
    label: 'Qwen',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    discoveryMode: 'openai-compatible',
  },
  stepfun: {
    label: 'StepFun',
    baseURL: 'https://api.stepfun.com/v1',
    discoveryMode: 'openai-compatible',
  },
}

function trimSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function buildEndpoint(baseURL: string, suffix: string) {
  return `${trimSlash(baseURL)}${suffix.startsWith('/') ? suffix : `/${suffix}`}`
}

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function titleCaseSegment(value: string) {
  return value
    .split(/[-_/.:]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function formatDisplayName(modelId: string, fallback?: string) {
  if (fallback?.trim()) {
    return fallback.trim()
  }

  const parts = modelId.split('/')
  return titleCaseSegment(parts[parts.length - 1] || modelId)
}

function normalizeOpenAiLikeModel(raw: Record<string, unknown>): DiscoveredModel | null {
  const modelId = typeof raw.id === 'string' ? raw.id : null
  if (!modelId) {
    return null
  }

  const modalities =
    Array.isArray(raw.modalities) || Array.isArray(raw.input_modalities)
      ? {
          input: toArray(raw.input_modalities ?? raw.modalities),
          output: toArray(raw.output_modalities),
        }
      : undefined

  return {
    modelId,
    displayName: formatDisplayName(
      modelId,
      typeof raw.name === 'string' ? raw.name : undefined,
    ),
    description:
      typeof raw.description === 'string' ? raw.description : undefined,
    ownedBy: typeof raw.owned_by === 'string' ? raw.owned_by : undefined,
    contextWindow:
      toNumber(raw.context_length) ??
      toNumber(raw.context_window) ??
      toNumber(raw.input_token_limit),
    maxOutputTokens:
      toNumber(raw.max_completion_tokens) ??
      toNumber(raw.output_token_limit) ??
      toNumber(raw.max_output_tokens),
    modalities,
  }
}

function normalizeOpenRouterModel(raw: Record<string, unknown>): DiscoveredModel | null {
  const modelId = typeof raw.id === 'string' ? raw.id : null
  if (!modelId) {
    return null
  }

  const architecture =
    raw.architecture && typeof raw.architecture === 'object'
      ? (raw.architecture as Record<string, unknown>)
      : undefined
  const topProvider =
    raw.top_provider && typeof raw.top_provider === 'object'
      ? (raw.top_provider as Record<string, unknown>)
      : undefined

  return {
    modelId,
    displayName: formatDisplayName(
      modelId,
      typeof raw.name === 'string' ? raw.name : undefined,
    ),
    description:
      typeof raw.description === 'string' ? raw.description : undefined,
    ownedBy:
      typeof raw.author === 'string'
        ? raw.author
        : typeof raw.owned_by === 'string'
          ? raw.owned_by
          : undefined,
    contextWindow: toNumber(raw.context_length),
    maxOutputTokens:
      toNumber(topProvider?.max_completion_tokens) ??
      toNumber(raw.max_output_tokens),
    modalities: architecture
      ? {
          input: toArray(architecture.input_modalities),
          output: toArray(architecture.output_modalities),
        }
      : undefined,
  }
}

function normalizeAnthropicModel(raw: Record<string, unknown>): DiscoveredModel | null {
  const modelId = typeof raw.id === 'string' ? raw.id : null
  if (!modelId) {
    return null
  }

  const inputModalities =
    typeof raw.type === 'string' ? [raw.type] : ['text']

  return {
    modelId,
    displayName: formatDisplayName(
      modelId,
      typeof raw.display_name === 'string' ? raw.display_name : undefined,
    ),
    description:
      typeof raw.description === 'string' ? raw.description : undefined,
    ownedBy: 'anthropic',
    contextWindow: toNumber(raw.context_window),
    maxOutputTokens: toNumber(raw.max_output_tokens),
    modalities: {
      input: inputModalities,
      output: ['text'],
    },
  }
}

function normalizeGoogleModel(raw: Record<string, unknown>): DiscoveredModel | null {
  const name = typeof raw.name === 'string' ? raw.name : null
  if (!name) {
    return null
  }

  const modelId = name.replace(/^models\//, '')

  return {
    modelId,
    displayName: formatDisplayName(
      modelId,
      typeof raw.displayName === 'string' ? raw.displayName : undefined,
    ),
    description:
      typeof raw.description === 'string' ? raw.description : undefined,
    ownedBy: 'google',
    contextWindow: toNumber(raw.inputTokenLimit),
    maxOutputTokens: toNumber(raw.outputTokenLimit),
    modalities: {
      input: toArray(raw.inputModalities),
      output: toArray(raw.outputModalities),
    },
  }
}

function dedupeAndSort(models: DiscoveredModel[]) {
  const byId = new Map<string, DiscoveredModel>()
  for (const model of models) {
    byId.set(model.modelId, model)
  }

  return [...byId.values()].sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  )
}

export function getProviderMetadata(providerType: ProviderType) {
  return PROVIDER_METADATA[providerType]
}

export function getProviderBaseURL(providerType: ProviderType, baseURL?: string) {
  return baseURL?.trim() || PROVIDER_METADATA[providerType].baseURL
}

export async function fetchProviderCatalog(args: {
  providerType: ProviderType
  apiKey: string
  baseURL?: string
  config?: ProviderConfig
}): Promise<ProviderCatalogResult> {
  const metadata = getProviderMetadata(args.providerType)
  const baseURL = getProviderBaseURL(args.providerType, args.baseURL)
  const fetchedAt = Date.now()

  if (metadata.discoveryMode === 'unsupported') {
    return {
      ok: false,
      fetchedAt,
      providerType: args.providerType,
      source: {
        discoveryMode: metadata.discoveryMode,
        baseURL,
        note: metadata.note,
      },
      modelCount: 0,
      models: [],
      error: metadata.note,
    }
  }

  if (!baseURL) {
    return {
      ok: false,
      fetchedAt,
      providerType: args.providerType,
      source: {
        discoveryMode: metadata.discoveryMode,
        note: 'A base URL is required for this provider type.',
      },
      modelCount: 0,
      models: [],
      error: 'A base URL is required for this provider type.',
    }
  }

  try {
    if (metadata.discoveryMode === 'google') {
      const url = new URL(buildEndpoint(baseURL, '/models'))
      url.searchParams.set('key', args.apiKey)

      for (const [key, value] of Object.entries(args.config?.queryParams ?? {})) {
        url.searchParams.set(key, value)
      }

      const response = await fetch(url.toString(), {
        headers: args.config?.headers,
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const payload = (await response.json()) as { models?: Record<string, unknown>[] }
      const models = dedupeAndSort(
        (payload.models ?? [])
          .map(normalizeGoogleModel)
          .filter((model): model is DiscoveredModel => Boolean(model)),
      )

      return {
        ok: true,
        fetchedAt,
        providerType: args.providerType,
        source: {
          discoveryMode: metadata.discoveryMode,
          baseURL,
          endpoint: url.toString(),
        },
        modelCount: models.length,
        models,
      }
    }

    if (metadata.discoveryMode === 'anthropic') {
      const endpoint = buildEndpoint(baseURL, '/models')
      const response = await fetch(endpoint, {
        headers: {
          'x-api-key': args.apiKey,
          'anthropic-version': '2023-06-01',
          ...args.config?.headers,
        },
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const payload = (await response.json()) as { data?: Record<string, unknown>[] }
      const models = dedupeAndSort(
        (payload.data ?? [])
          .map(normalizeAnthropicModel)
          .filter((model): model is DiscoveredModel => Boolean(model)),
      )

      return {
        ok: true,
        fetchedAt,
        providerType: args.providerType,
        source: {
          discoveryMode: metadata.discoveryMode,
          baseURL,
          endpoint,
        },
        modelCount: models.length,
        models,
      }
    }

    const endpoint = buildEndpoint(baseURL, '/models')
    const headers: Record<string, string> = {
      Authorization: `Bearer ${args.apiKey}`,
      ...args.config?.headers,
    }

    if (args.providerType === 'openai' && args.config?.organization) {
      headers['OpenAI-Organization'] = args.config.organization
    }
    if (args.providerType === 'openai' && args.config?.project) {
      headers['OpenAI-Project'] = args.config.project
    }

    const url = new URL(endpoint)
    for (const [key, value] of Object.entries(args.config?.queryParams ?? {})) {
      url.searchParams.set(key, value)
    }

    const response = await fetch(url.toString(), {
      headers,
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    const payload = (await response.json()) as
      | { data?: Record<string, unknown>[] }
      | Record<string, unknown>[]
    const rawModels = Array.isArray(payload) ? payload : payload.data ?? []
    const normalizer =
      args.providerType === 'openrouter'
        ? normalizeOpenRouterModel
        : normalizeOpenAiLikeModel
    const models = dedupeAndSort(
      rawModels
        .map(normalizer)
        .filter((model): model is DiscoveredModel => Boolean(model)),
    )

    return {
      ok: true,
      fetchedAt,
      providerType: args.providerType,
      source: {
        discoveryMode: metadata.discoveryMode,
        baseURL,
        endpoint: url.toString(),
      },
      modelCount: models.length,
      models,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to discover models.'

    return {
      ok: false,
      fetchedAt,
      providerType: args.providerType,
      source: {
        discoveryMode: metadata.discoveryMode,
        baseURL,
      },
      modelCount: 0,
      models: [],
      error: message,
    }
  }
}
