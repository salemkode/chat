import AsyncStorage from '@react-native-async-storage/async-storage'
import { isAutoModelSelection } from '@chat/shared'
import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type Id } from '../lib/convexApi'
import { cacheModels, readModels } from '../offline/cache'
import type { MobileOfflineModelRecord } from '../offline/types'
import { useNetworkStatus } from '../utils/network-status'
import { normalizeModel } from './normalize'
import { type ModelsWithProviders, withOptimisticModels } from './optimistic'

const MODEL_STORAGE_KEY = 'mobile:selected-model'

export function useModels() {
  const { isOnline } = useNetworkStatus()
  const data = useQuery(api.admin.listModelsWithProviders as never) as
    | ModelsWithProviders
    | undefined
  const setFavoriteModel = useMutation(api.admin.setFavoriteModel as never).withOptimisticUpdate(
    (localStore, args: { modelId: Id<'models'>; isFavorite: boolean }) => {
      withOptimisticModels(localStore, (current) => ({
        ...current,
        models: (current.models ?? []).map((model: ModelsWithProviders['models'][number]) =>
          model._id === args.modelId ? { ...model, isFavorite: args.isFavorite } : model,
        ),
      }))
    },
  )
  const [cachedModels, setCachedModels] = useState<MobileOfflineModelRecord[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  useEffect(() => {
    void readModels().then(setCachedModels)
    void AsyncStorage.getItem(MODEL_STORAGE_KEY).then(setSelectedModelId)
  }, [])

  useEffect(() => {
    const models = data?.models ?? []
    if (!models.length) return
    const normalized = models.map(normalizeModel)
    setCachedModels(normalized)
    void cacheModels(normalized)
  }, [data?.models])

  const models = useMemo(() => {
    const source = data?.models?.length ? data.models.map(normalizeModel) : cachedModels
    return [...source].sort((a, b) => {
      if (Number(b.isFavorite) !== Number(a.isFavorite)) {
        return Number(b.isFavorite) - Number(a.isFavorite)
      }
      return a.sortOrder - b.sortOrder
    })
  }, [cachedModels, data?.models])

  const resolvedSelectedModel = useMemo(() => {
    if (
      selectedModelId &&
      (models.some((item) => item.modelId === selectedModelId) ||
        (data?.autoModelAvailable === true && isAutoModelSelection(selectedModelId)))
    ) {
      return selectedModelId
    }
    return models.find((item) => item.isFavorite)?.modelId ?? models[0]?.modelId ?? null
  }, [models, selectedModelId])

  return {
    models,
    autoModelAvailable: data?.autoModelAvailable ?? false,
    selectedModelId: resolvedSelectedModel,
    setSelectedModelId: useCallback(async (modelId: string) => {
      setSelectedModelId(modelId)
      await AsyncStorage.setItem(MODEL_STORAGE_KEY, modelId)
    }, []),
    setFavorite: useCallback(
      async (modelId: string, isFavorite: boolean) => {
        if (!isOnline) return
        await setFavoriteModel({
          modelId: modelId as Id<'models'>,
          isFavorite,
        } as never)
      },
      [isOnline, setFavoriteModel],
    ),
  }
}
