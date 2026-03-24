import { useCallback, useEffect, useState } from 'react'
import { readDraft, writeDraft } from '../offline/cache'

export function useDraft(threadId: string) {
  const [draft, setDraftState] = useState('')

  useEffect(() => {
    void readDraft(threadId).then(setDraftState)
  }, [threadId])

  const setDraft = useCallback(
    async (value: string) => {
      setDraftState(value)
      await writeDraft(threadId, value)
    },
    [threadId],
  )

  return { draft, setDraft }
}
