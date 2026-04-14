'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AUTO_MODEL_ID, isAutoModelSelection } from '@chat/shared'
import { useModels } from '@/hooks/use-chat-data'

const LAST_USED_MODEL_STORAGE_KEY = 'last-used-model-id'
const DEFAULT_MODEL_STORAGE_KEY = 'default-model-id'

type ChatModelContextValue = {
  selectedModelId?: string
  defaultModelId?: string
  setSelectedModelId: (modelId: string) => void
  setDefaultModelId: (modelId: string) => void
}

const ChatModelContext = createContext<ChatModelContextValue | null>(null)

export function ChatModelProvider({ children }: { children: ReactNode }) {
  const { models, autoModelAvailable } = useModels()
  const [selectedModelId, setSelectedModelIdState] = useState<string | undefined>(undefined)
  const [defaultModelId, setDefaultModelIdState] = useState<string | undefined>(undefined)
  const [isStorageHydrated, setIsStorageHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const storedLastUsedModelId = localStorage.getItem(LAST_USED_MODEL_STORAGE_KEY) || undefined
    const storedDefaultModelId =
      localStorage.getItem(DEFAULT_MODEL_STORAGE_KEY) || storedLastUsedModelId || undefined

    setSelectedModelIdState(storedLastUsedModelId)
    setDefaultModelIdState(storedDefaultModelId)
    setIsStorageHydrated(true)
  }, [])

  useEffect(() => {
    if (!isStorageHydrated || models.length === 0) {
      return
    }

    const hasSelectedModel = models.some((model) => model.modelId === selectedModelId)
    if (hasSelectedModel || (autoModelAvailable && isAutoModelSelection(selectedModelId))) {
      return
    }

    const hasDefaultModel = models.some((model) => model.modelId === defaultModelId)
    const fallbackModelId =
      (hasDefaultModel || (autoModelAvailable && isAutoModelSelection(defaultModelId))
        ? defaultModelId
        : undefined) ??
      (autoModelAvailable ? AUTO_MODEL_ID : undefined) ??
      models[0]?.modelId

    if (!fallbackModelId) {
      return
    }

    setSelectedModelIdState(fallbackModelId)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_USED_MODEL_STORAGE_KEY, fallbackModelId)
    }
  }, [autoModelAvailable, defaultModelId, isStorageHydrated, models, selectedModelId])

  const value = useMemo(
    () => ({
      selectedModelId,
      defaultModelId,
      setSelectedModelId: (modelId: string) => {
        setSelectedModelIdState(modelId)
        if (typeof window !== 'undefined') {
          localStorage.setItem(LAST_USED_MODEL_STORAGE_KEY, modelId)
        }
      },
      setDefaultModelId: (modelId: string) => {
        setDefaultModelIdState(modelId)
        if (typeof window !== 'undefined') {
          localStorage.setItem(DEFAULT_MODEL_STORAGE_KEY, modelId)
        }
      },
    }),
    [defaultModelId, selectedModelId],
  )

  return <ChatModelContext.Provider value={value}>{children}</ChatModelContext.Provider>
}

export function useChatModel() {
  const value = useContext(ChatModelContext)
  if (!value) {
    throw new Error('useChatModel must be used within a ChatModelProvider')
  }

  return value
}
