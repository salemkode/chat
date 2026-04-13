'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AUTO_MODEL_ID, isAutoModelSelection } from '@chat/shared'
import { useModels } from '@/hooks/use-chat-data'

const STORAGE_KEY = 'selected-model-id'

type ChatModelContextValue = {
  selectedModelId?: string
  setSelectedModelId: (modelId: string) => void
}

const ChatModelContext = createContext<ChatModelContextValue | null>(null)

export function ChatModelProvider({ children }: { children: ReactNode }) {
  const { models, autoModelAvailable } = useModels()
  const [selectedModelId, setSelectedModelIdState] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const storedModelId = localStorage.getItem(STORAGE_KEY) || undefined
    if (storedModelId) {
      setSelectedModelIdState(storedModelId)
    }
  }, [])

  useEffect(() => {
    if (models.length === 0) {
      return
    }

    const hasSelectedModel = models.some((model) => model.modelId === selectedModelId)
    if (hasSelectedModel || (autoModelAvailable && isAutoModelSelection(selectedModelId))) {
      return
    }

    setSelectedModelIdState(models[0]?.modelId)
    if (typeof window !== 'undefined' && models[0]?.modelId) {
      localStorage.setItem(STORAGE_KEY, models[0].modelId)
    }
  }, [models, selectedModelId])

  const value = useMemo(
    () => ({
      selectedModelId,
      setSelectedModelId: (modelId: string) => {
        setSelectedModelIdState(modelId)
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, modelId)
        }
      },
    }),
    [selectedModelId],
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
