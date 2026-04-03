import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/convexApi'
import type { VoiceTranscriptionMode } from '../lib/voice'

export function useUserSettings() {
  const settings = useQuery(api.users.getSettings as never) as
    | {
        voiceTranscriptionMode?: VoiceTranscriptionMode
      }
    | null
    | undefined
  const updateSettings = useMutation(api.users.updateSettings as never)
  const [pendingVoiceMode, setPendingVoiceMode] = useState<VoiceTranscriptionMode | null>(null)

  useEffect(() => {
    if (!pendingVoiceMode) {
      return
    }

    const resolvedMode = settings?.voiceTranscriptionMode ?? 'cloud'
    if (resolvedMode === pendingVoiceMode) {
      setPendingVoiceMode(null)
    }
  }, [pendingVoiceMode, settings?.voiceTranscriptionMode])

  const voiceTranscriptionMode = pendingVoiceMode ?? settings?.voiceTranscriptionMode ?? 'cloud'

  return {
    settings,
    voiceTranscriptionMode,
    setVoiceTranscriptionMode: useCallback(
      async (mode: VoiceTranscriptionMode) => {
        setPendingVoiceMode(mode)
        try {
          await updateSettings({
            voiceTranscriptionMode: mode,
          } as never)
        } catch (error) {
          setPendingVoiceMode(null)
          throw error
        }
      },
      [updateSettings],
    ),
    isLoading: settings === undefined,
    isUpdatingVoiceMode: pendingVoiceMode !== null,
  }
}
