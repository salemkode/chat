/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- Convex action results */
import { useAction, useMutation } from 'convex/react'
import type { Doc } from '@convex/_generated/dataModel'
import { createContext, useCallback, useContext, useMemo, useReducer } from 'react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import {
  initialDiscoveryState,
  mergeReducer,
  type DiscoveryState,
} from '@/components/admin/admin-form-state'
import type { ProviderFormData } from '@/components/admin/admin-form-state'
import { parseJsonRecord } from '@/components/admin/admin-json'
import type { ProviderType } from '@/components/admin/admin-provider-catalog'
import type { AdminModel, AdminProvider, ProviderCatalogResult } from '@/components/admin/types'

type InspectSource = {
  providerId: Doc<'providers'>['_id'] | undefined
  providerType: ProviderType
  apiKey: string
  baseURL?: string
  config?: AdminProvider['config']
}

type AdminDiscoveryContextValue = {
  discoveringProviderId: string | undefined
  discoveryResult: ProviderCatalogResult | null
  activeDiscoveryProviderId: string | undefined
  isImportingDiscovery: boolean
  selectedDiscoveryModelIds: string[]
  existingDiscoveredModelIds: Set<string>
  selectedDiscoveredModels: ProviderCatalogResult['models']
  selectedDiscoveredCount: number
  inspectSavedProvider: (provider: AdminProvider) => Promise<void>
  inspectDraftProvider: (form: ProviderFormData) => Promise<void>
  importSelectedModels: () => Promise<void>
  toggleDiscoveryModelSelection: (modelId: string) => void
  selectAllDiscoveredModels: () => void
  clearDiscoveredModelSelection: () => void
}

const AdminDiscoveryContext = createContext<AdminDiscoveryContextValue | null>(null)

export function AdminDiscoveryProvider({
  models,
  children,
}: {
  models: AdminModel[]
  children: React.ReactNode
}) {
  const [state, update] = useReducer(mergeReducer<DiscoveryState>, initialDiscoveryState)
  const inspectProviderCatalog = useAction(api.admin.inspectProviderCatalog)
  const importDiscoveredModels = useMutation(api.admin.importDiscoveredModels)

  const activeDiscoveryProviderId = state.activeProviderId
  const discoveryResult = state.result
  const discoveringProviderId = state.discoveringProviderId
  const isImportingDiscovery = state.isImporting
  const selectedDiscoveryModelIds = state.selectedModelIds

  const setActiveDiscoveryProviderId = (activeProviderId: string | undefined) =>
    update({ activeProviderId })
  const setDiscoveryResult = (result: ProviderCatalogResult | null) => update({ result })
  const setDiscoveringProviderId = (discoveringProviderId: string | undefined) =>
    update({ discoveringProviderId })
  const setIsImportingDiscovery = (isImporting: boolean) => update({ isImporting })
  const setSelectedDiscoveryModelIds = (selectedModelIds: string[]) => update({ selectedModelIds })

  const existingDiscoveredModelIds = useMemo(
    () =>
      new Set<string>(
        models
          .filter(
            (model: AdminModel) =>
              !!activeDiscoveryProviderId && model.providerId === activeDiscoveryProviderId,
          )
          .map((model: AdminModel) => model.modelId),
      ),
    [activeDiscoveryProviderId, models],
  )

  const selectedDiscoveredModels = useMemo(() => {
    if (!discoveryResult?.ok) {
      return []
    }
    const selectedIds = new Set(selectedDiscoveryModelIds)
    return discoveryResult.models.filter((model: ProviderCatalogResult['models'][number]) =>
      selectedIds.has(model.modelId),
    )
  }, [discoveryResult, selectedDiscoveryModelIds])

  const runInspect = useCallback(
    async (source: InspectSource) => {
      if (!source.apiKey) {
        toast.error('Add an API key before inspecting a provider catalog.')
        return
      }

      setDiscoveringProviderId(source.providerId ?? 'draft')

      return inspectProviderCatalog(source)
        .then((result) => {
          setDiscoveryResult(result)
          setActiveDiscoveryProviderId(source.providerId)
          setSelectedDiscoveryModelIds([])
          if (result.ok) {
            toast.success(`Fetched ${result.modelCount} models`)
          } else {
            toast.error(result.error ?? 'Failed to inspect provider')
          }
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : 'Failed to inspect provider')
        })
        .finally(() => {
          setDiscoveringProviderId(undefined)
        })
    },
    [inspectProviderCatalog],
  )

  const inspectSavedProvider = useCallback(
    async (provider: AdminProvider) => {
      await runInspect({
        providerId: provider._id,
        providerType: provider.providerType as ProviderType,
        apiKey: provider.apiKey,
        baseURL: provider.baseURL ?? undefined,
        config: provider.config,
      })
    },
    [runInspect],
  )

  const inspectDraftProvider = useCallback(
    async (form: ProviderFormData) => {
      let headers: Record<string, string> | undefined
      let queryParams: Record<string, string> | undefined
      try {
        headers = parseJsonRecord(form.headersJson, 'Headers')
        queryParams = parseJsonRecord(form.queryParamsJson, 'Query params')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Invalid provider JSON fields.')
        return
      }

      await runInspect({
        providerId: undefined,
        providerType: form.providerType,
        apiKey: form.apiKey,
        baseURL: form.baseURL || undefined,
        config: {
          organization: form.organization || undefined,
          project: form.project || undefined,
          headers,
          queryParams,
        },
      })
    },
    [runInspect],
  )

  const importSelectedModels = useCallback(async () => {
    if (!discoveryResult?.ok || !activeDiscoveryProviderId) {
      toast.error('Save the provider first, then import discovered models.')
      return
    }

    if (selectedDiscoveredModels.length === 0) {
      toast.error('Select at least one model to import.')
      return
    }

    setIsImportingDiscovery(true)

    return importDiscoveredModels({
      providerId: activeDiscoveryProviderId as Doc<'providers'>['_id'],
      models: selectedDiscoveredModels,
      enableImportedModels: true,
    })
      .then((result) => {
        toast.success(`Imported ${result.inserted} new models, updated ${result.updated}.`)
        setSelectedDiscoveryModelIds([])
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to import models')
      })
      .finally(() => {
        setIsImportingDiscovery(false)
      })
  }, [activeDiscoveryProviderId, discoveryResult, importDiscoveredModels, selectedDiscoveredModels])

  const toggleDiscoveryModelSelection = useCallback(
    (modelId: string) => {
      setSelectedDiscoveryModelIds(
        selectedDiscoveryModelIds.includes(modelId)
          ? selectedDiscoveryModelIds.filter((selectedId) => selectedId !== modelId)
          : [...selectedDiscoveryModelIds, modelId],
      )
    },
    [selectedDiscoveryModelIds],
  )

  const selectAllDiscoveredModels = useCallback(() => {
    setSelectedDiscoveryModelIds(
      discoveryResult?.ok
        ? discoveryResult.models.map(
            (model: ProviderCatalogResult['models'][number]) => model.modelId,
          )
        : [],
    )
  }, [discoveryResult])

  const clearDiscoveredModelSelection = useCallback(() => {
    setSelectedDiscoveryModelIds([])
  }, [])

  const value = useMemo<AdminDiscoveryContextValue>(
    () => ({
      discoveringProviderId,
      discoveryResult,
      activeDiscoveryProviderId,
      isImportingDiscovery,
      selectedDiscoveryModelIds,
      existingDiscoveredModelIds,
      selectedDiscoveredModels,
      selectedDiscoveredCount: selectedDiscoveredModels.length,
      inspectSavedProvider,
      inspectDraftProvider,
      importSelectedModels,
      toggleDiscoveryModelSelection,
      selectAllDiscoveredModels,
      clearDiscoveredModelSelection,
    }),
    [
      activeDiscoveryProviderId,
      clearDiscoveredModelSelection,
      discoveringProviderId,
      discoveryResult,
      existingDiscoveredModelIds,
      importSelectedModels,
      inspectDraftProvider,
      inspectSavedProvider,
      isImportingDiscovery,
      selectAllDiscoveredModels,
      selectedDiscoveredModels,
      selectedDiscoveryModelIds,
      toggleDiscoveryModelSelection,
    ],
  )

  return <AdminDiscoveryContext.Provider value={value}>{children}</AdminDiscoveryContext.Provider>
}

export function useAdminDiscovery(): AdminDiscoveryContextValue {
  const ctx = useContext(AdminDiscoveryContext)
  if (!ctx) {
    throw new Error('useAdminDiscovery must be used within AdminDiscoveryProvider')
  }
  return ctx
}
