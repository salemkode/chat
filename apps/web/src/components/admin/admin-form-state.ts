import type { Doc } from '@convex/_generated/dataModel'
import type { RateLimitPolicy } from '@/components/admin/rate-limit-editor'
import type {
  AdminModelCollection,
  IconType,
  ProviderCatalogResult,
} from '@/components/admin/types'
import type { AppPlan } from '@chat/shared/admin-types'
import { defaultBaseURL, type ProviderType } from '@/components/admin/admin-provider-catalog'

export interface ProviderFormData {
  name: string
  providerType: ProviderType
  apiKey: string
  baseURL: string
  description: string
  isEnabled: boolean
  sortOrder: number
  icon?: string
  iconType?: IconType
  iconId?: string
  organization: string
  project: string
  headersJson: string
  queryParamsJson: string
  rateLimit?: RateLimitPolicy
}

export interface ModelFormData {
  modelId: string
  displayName: string
  description: string
  isEnabled: boolean
  isFree: boolean
  sortOrder: number
  providerId: string
  icon?: string
  iconType?: IconType
  iconId?: string
  capabilitiesText: string
  supportsReasoning: boolean
  reasoningLevels: Array<'low' | 'medium' | 'high'>
  defaultReasoningLevel: 'off' | 'low' | 'medium' | 'high'
  ownedBy: string
  contextWindow: string
  maxOutputTokens: string
  supportedAttachmentMediaTypesText: string
  rateLimit?: RateLimitPolicy
}

export interface ModelCollectionFormData {
  name: string
  description: string
  sortOrder: number
  modelIds: string[]
}

export type StateUpdate<T> = Partial<T> | ((state: T) => T)

export type AdminSessionState = {
  initializedUserId: string | null
}

export type ProviderDialogState = {
  open: boolean
  editingProvider: Doc<'providers'> | null
  iconPreviewUrl?: string
  form: ProviderFormData
}

export type ModelDialogState = {
  open: boolean
  editingModel: Doc<'models'> | null
  iconPreviewUrl?: string
  form: ModelFormData
}

export type ModelCollectionDialogState = {
  open: boolean
  editingCollection: AdminModelCollection | null
  form: ModelCollectionFormData
}

export type DiscoveryState = {
  activeProviderId?: string
  result: ProviderCatalogResult | null
  discoveringProviderId?: string
  isImporting: boolean
  selectedModelIds: string[]
}

export type SettingsState = {
  isSavingSettings: boolean
  isStartingCheckout: boolean
  isOpeningBillingPortal: boolean
  appPlanDraft?: AppPlan
  globalRateLimitDraft?: RateLimitPolicy
  autoModelRoutingEnabledDraft?: boolean
  autoModelRouterUrlDraft?: string
  autoModelRouterApiKeyDraft?: string
  autoModelRouterPreferenceDraft?: 'balanced' | 'cost' | 'speed' | 'quality'
}

export function createProviderForm(sortOrder = 0): ProviderFormData {
  return {
    name: '',
    providerType: 'openrouter',
    apiKey: '',
    baseURL: defaultBaseURL('openrouter'),
    description: '',
    isEnabled: true,
    sortOrder,
    icon: 'Boxes',
    iconType: 'phosphor',
    iconId: undefined,
    organization: '',
    project: '',
    headersJson: '',
    queryParamsJson: '',
    rateLimit: undefined,
  }
}

export function createModelForm(providerId = '', sortOrder = 0): ModelFormData {
  return {
    modelId: '',
    displayName: '',
    description: '',
    isEnabled: true,
    isFree: false,
    sortOrder,
    providerId,
    icon: 'Sparkles',
    iconType: 'phosphor',
    iconId: undefined,
    capabilitiesText: '',
    supportsReasoning: false,
    reasoningLevels: ['low', 'medium', 'high'],
    defaultReasoningLevel: 'off',
    ownedBy: '',
    contextWindow: '',
    maxOutputTokens: '',
    supportedAttachmentMediaTypesText: '',
    rateLimit: undefined,
  }
}

export function createModelCollectionForm(sortOrder = 0): ModelCollectionFormData {
  return {
    name: '',
    description: '',
    sortOrder,
    modelIds: [],
  }
}

export const initialAdminSessionState: AdminSessionState = {
  initializedUserId: null,
}

export const initialProviderDialogState: ProviderDialogState = {
  open: false,
  editingProvider: null,
  iconPreviewUrl: undefined,
  form: createProviderForm(),
}

export const initialModelDialogState: ModelDialogState = {
  open: false,
  editingModel: null,
  iconPreviewUrl: undefined,
  form: createModelForm(),
}

export const initialModelCollectionDialogState: ModelCollectionDialogState = {
  open: false,
  editingCollection: null,
  form: createModelCollectionForm(),
}

export const initialDiscoveryState: DiscoveryState = {
  activeProviderId: undefined,
  result: null,
  discoveringProviderId: undefined,
  isImporting: false,
  selectedModelIds: [],
}

export const initialSettingsState: SettingsState = {
  isSavingSettings: false,
  isStartingCheckout: false,
  isOpeningBillingPortal: false,
  appPlanDraft: undefined,
  globalRateLimitDraft: undefined,
  autoModelRoutingEnabledDraft: undefined,
  autoModelRouterUrlDraft: undefined,
  autoModelRouterApiKeyDraft: undefined,
  autoModelRouterPreferenceDraft: undefined,
}

export function mergeReducer<T extends object>(state: T, action: StateUpdate<T>) {
  return typeof action === 'function' ? action(state) : { ...state, ...action }
}
