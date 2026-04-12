import { useCallback, useEffect, useRef, useState } from 'react'
import { readDraft, writeDraft } from '../offline/cache'

type SetDraftOptions = {
  persistTo?: string | string[]
}

export function useDraft(threadId: string) {
  const [draft, setDraftState] = useState('')
  const loadRequestIdRef = useRef(0)
  const threadIdRef = useRef(threadId)

  useEffect(() => {
    threadIdRef.current = threadId
  }, [threadId])

  useEffect(() => {
    const requestId = loadRequestIdRef.current + 1
    loadRequestIdRef.current = requestId
    let cancelled = false
    setDraftState('')

    void readDraft(threadId).then((value) => {
      if (cancelled || loadRequestIdRef.current !== requestId) {
        return
      }
      setDraftState(value)
    })

    return () => {
      cancelled = true
    }
  }, [threadId])

  const setDraft = useCallback(
    async (value: string, options?: SetDraftOptions) => {
      setDraftState(value)

      const persistTargets = options?.persistTo ?? threadIdRef.current
      const targetIds = Array.isArray(persistTargets) ? persistTargets : [persistTargets]
      const uniqueTargetIds = [...new Set(targetIds.filter(Boolean))]
      await Promise.all(uniqueTargetIds.map((targetId) => writeDraft(targetId, value)))
    },
    [],
  )

  return { draft, setDraft }
}
