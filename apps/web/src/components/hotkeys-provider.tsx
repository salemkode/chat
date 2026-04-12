'use client'

import * as React from 'react'
import {
  getConflictingHotkeyAction,
  getDefaultHotkeyBindings,
  HOTKEY_DEFINITIONS,
  HOTKEY_STORAGE_KEY,
  matchesHotkeyBinding,
  normalizeHotkeyBindings,
  shouldIgnoreHotkeyTarget,
  type HotkeyActionId,
  type HotkeyBinding,
  type HotkeyBindings,
} from '@/lib/hotkeys'

type HotkeyActionHandler = () => void

type HotkeysContextValue = {
  bindings: HotkeyBindings
  registerAction: (
    actionId: HotkeyActionId,
    token: symbol,
    handler: HotkeyActionHandler,
  ) => () => void
  updateBinding: (actionId: HotkeyActionId, binding: HotkeyBinding) => boolean
  resetBinding: (actionId: HotkeyActionId) => void
  resetAllBindings: () => void
}

const HotkeysContext = React.createContext<HotkeysContextValue | null>(null)

export function HotkeysProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [bindings, setBindings] = React.useState<HotkeyBindings>(
    getDefaultHotkeyBindings,
  )
  const handlersRef = React.useRef(
    new Map<HotkeyActionId, Map<symbol, HotkeyActionHandler>>(),
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const raw = window.localStorage.getItem(HOTKEY_STORAGE_KEY)
    if (!raw) {
      return
    }

    try {
      const parsed = JSON.parse(raw) as Partial<HotkeyBindings>
      setBindings(normalizeHotkeyBindings(parsed))
    } catch {
      setBindings(getDefaultHotkeyBindings())
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify(bindings))
  }, [bindings])

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      for (const definition of HOTKEY_DEFINITIONS) {
        const binding = bindings[definition.id]
        if (!matchesHotkeyBinding(binding, event)) {
          continue
        }

        if (
          definition.allowInInput !== true &&
          shouldIgnoreHotkeyTarget(event.target)
        ) {
          return
        }

        const handlers = handlersRef.current.get(definition.id)
        const handler = handlers ? Array.from(handlers.values()).at(-1) : null

        if (!handler) {
          return
        }

        event.preventDefault()
        handler()
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [bindings])

  const updateBinding = React.useCallback(
    (actionId: HotkeyActionId, binding: HotkeyBinding) => {
      let updated = false

      setBindings((current) => {
        const conflict = getConflictingHotkeyAction(actionId, binding, current)
        if (conflict) {
          return current
        }

        updated = true
        return {
          ...current,
          [actionId]: binding,
        }
      })

      return updated
    },
    [],
  )

  const resetBinding = React.useCallback((actionId: HotkeyActionId) => {
    setBindings((current) => ({
      ...current,
      [actionId]: getDefaultHotkeyBindings()[actionId],
    }))
  }, [])

  const resetAllBindings = React.useCallback(() => {
    setBindings(getDefaultHotkeyBindings())
  }, [])

  const contextValue = React.useMemo<HotkeysContextValue>(
    () => ({
      bindings,
      registerAction: (actionId, token, handler) => {
        const handlers =
          handlersRef.current.get(actionId) ?? new Map<symbol, HotkeyActionHandler>()
        handlers.set(token, handler)
        handlersRef.current.set(actionId, handlers)

        return () => {
          const currentHandlers = handlersRef.current.get(actionId)
          currentHandlers?.delete(token)
          if (currentHandlers && currentHandlers.size === 0) {
            handlersRef.current.delete(actionId)
          }
        }
      },
      updateBinding,
      resetBinding,
      resetAllBindings,
    }),
    [bindings, resetAllBindings, resetBinding, updateBinding],
  )

  return (
    <HotkeysContext.Provider value={contextValue}>
      {children}
    </HotkeysContext.Provider>
  )
}

export function useHotkeys() {
  const context = React.useContext(HotkeysContext)
  if (!context) {
    throw new Error('useHotkeys must be used within a HotkeysProvider.')
  }

  return context
}

export function useHotkeyAction(
  actionId: HotkeyActionId,
  handler: HotkeyActionHandler,
  enabled = true,
) {
  const context = React.useContext(HotkeysContext)
  const handlerRef = React.useRef(handler)

  React.useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  React.useEffect(() => {
    if (!context || !enabled) {
      return
    }

    const token = Symbol(actionId)
    return context.registerAction(actionId, token, () => handlerRef.current())
  }, [actionId, context, enabled])
}
