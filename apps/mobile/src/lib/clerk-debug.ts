import { useEffect, useRef } from 'react'

const DEFAULT_LOAD_WARNING_MS = 4000

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: error,
    }
  }

  if (typeof error === 'string') {
    return {
      message: error,
      details: error,
    }
  }

  if (error && typeof error === 'object') {
    const maybeClerkError = error as {
      message?: string
      errors?: Array<{ longMessage?: string; message?: string; code?: string }>
      code?: string
    }

    return {
      message:
        maybeClerkError.message ||
        maybeClerkError.errors?.[0]?.longMessage ||
        maybeClerkError.errors?.[0]?.message ||
        'Unknown Clerk error',
      details: error,
    }
  }

  return {
    message: 'Unknown Clerk error',
    details: error,
  }
}

export function logClerkError(context: string, error: unknown) {
  const normalized = normalizeError(error)
  console.error(`[Clerk] ${context}: ${normalized.message}`, normalized.details)
}

export function logClerkWarning(context: string, details?: unknown) {
  console.warn(`[Clerk] ${context}`, details)
}

export function useClerkLoadDebug(scope: string, isLoaded: boolean) {
  const hasWarnedRef = useRef(false)

  useEffect(() => {
    if (isLoaded) {
      hasWarnedRef.current = false
      return
    }

    const timeoutId = setTimeout(() => {
      hasWarnedRef.current = true
      logClerkWarning(`${scope} is still waiting for Clerk to load`, {
        isLoaded,
        timeoutMs: DEFAULT_LOAD_WARNING_MS,
      })
    }, DEFAULT_LOAD_WARNING_MS)

    return () => clearTimeout(timeoutId)
  }, [isLoaded, scope])
}
