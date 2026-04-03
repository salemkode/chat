import { useAction, useMutation } from 'convex/react'
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type SpeechRecognitionErrorEvent,
  type SpeechRecognitionResultEvent,
} from 'expo-speech-recognition'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, type Id } from '../../lib/convexApi'
import {
  appendVoiceTranscript,
  formatVoiceDuration,
  getDefaultVoiceLocale,
  getRecordingFilename,
  getRecordingMimeType,
  type VoiceComposerState,
} from '../../lib/voice'
import { useUserSettings } from '../../mobile-data/use-user-settings'
import { uriToBlob } from '../../mobile-data/attachments'
import { useNetworkStatus } from '../../utils/network-status'

const MAX_CLOUD_RECORDING_MILLIS = 60_000

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

function getOnDeviceUnavailableMessage() {
  return "On-device recognition isn't available on this device. Switch to cloud mode in settings."
}

function normalizeSupportedLocales(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry : ''))
      .filter(Boolean)
      .map((entry) => entry.toLowerCase())
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).map((entry) => entry.toLowerCase())
  }

  return []
}

async function supportsLocaleOnDevice(locale: string) {
  const value = await ExpoSpeechRecognitionModule.getSupportedLocales?.()
  const supportedLocales = normalizeSupportedLocales(value)
  if (!supportedLocales.length) {
    return true
  }

  const normalizedLocale = locale.toLowerCase()
  return supportedLocales.some(
    (entry) =>
      entry === normalizedLocale ||
      entry.startsWith(`${normalizedLocale}-`) ||
      normalizedLocale.startsWith(`${entry}-`),
  )
}

export function useVoiceComposer({
  draft,
  setDraft,
  onDraftUpdated,
}: {
  draft: string
  setDraft: (value: string) => Promise<void> | void
  onDraftUpdated?: (value: string) => void
}) {
  const { isOnline } = useNetworkStatus()
  const { voiceTranscriptionMode } = useUserSettings()
  const generateUploadUrl = useMutation(api.voice.generateUploadUrl as never)
  const transcribeAudio = useAction(api.voice.transcribeAudio as never)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const recorderState = useAudioRecorderState(recorder, 250)
  const [voiceState, setVoiceState] = useState<VoiceComposerState>('idle')
  const [voicePreviewText, setVoicePreviewText] = useState<string>()
  const [voiceErrorOverride, setVoiceErrorOverride] = useState<string | null>(null)

  const draftRef = useRef(draft)
  const voiceStateRef = useRef<VoiceComposerState>('idle')
  const voiceModeRef = useRef(voiceTranscriptionMode)
  const activeSessionIdRef = useRef(0)
  const deviceStopRequestedRef = useRef(false)
  const deviceAbortExpectedRef = useRef(false)
  const deviceFinalTranscriptRef = useRef('')
  const voiceLocale = useMemo(() => getDefaultVoiceLocale(), [])

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    voiceStateRef.current = voiceState
  }, [voiceState])

  useEffect(() => {
    voiceModeRef.current = voiceTranscriptionMode
  }, [voiceTranscriptionMode])

  const isRecognitionAvailable = ExpoSpeechRecognitionModule.isRecognitionAvailable()
  const supportsOnDeviceRecognition = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()
  const deviceModeSupported = isRecognitionAvailable && supportsOnDeviceRecognition

  const availabilityError =
    voiceTranscriptionMode === 'cloud' && !isOnline
      ? 'Cloud transcription requires internet.'
      : voiceTranscriptionMode === 'device' && !deviceModeSupported
        ? getOnDeviceUnavailableMessage()
        : null

  const applyTranscript = useCallback(
    async (transcript: string) => {
      const nextDraft = appendVoiceTranscript(draftRef.current, transcript)
      if (nextDraft === draftRef.current) {
        return
      }

      await setDraft(nextDraft)
      onDraftUpdated?.(nextDraft)
    },
    [onDraftUpdated, setDraft],
  )

  const resetAudioSession = useCallback(async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
      })
    } catch (error) {
      console.warn('[voice-composer] failed to reset audio mode', error)
    }
  }, [])

  const discardCloudRecording = useCallback(async () => {
    try {
      if (recorderState.isRecording || recorder.isRecording) {
        await recorder.stop()
      }
    } catch (error) {
      console.warn('[voice-composer] failed to discard recording', error)
    } finally {
      await resetAudioSession()
    }
  }, [recorder, recorderState.isRecording, resetAudioSession])

  const stopCloudRecording = useCallback(async () => {
    const sessionId = activeSessionIdRef.current
    setVoiceState('transcribing')
    setVoicePreviewText('Transcribing...')

    let uri = recorderState.url ?? recorder.uri
    try {
      await recorder.stop()
      uri = recorder.uri ?? recorderState.url ?? uri
    } catch (error) {
      await resetAudioSession()
      throw new Error(getErrorMessage(error, 'Failed to stop voice recording.'))
    }

    await resetAudioSession()

    if (!uri) {
      throw new Error('Unable to access the recorded audio clip.')
    }

    const mimeType = getRecordingMimeType(uri)
    const uploadUrl = await generateUploadUrl({} as never)
    const blob = await uriToBlob(uri)
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
      },
      body: blob,
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload the voice recording.')
    }

    const payload = (await uploadResponse.json()) as { storageId: string }
    const result = (await transcribeAudio({
      storageId: payload.storageId as Id<'_storage'>,
      mimeType,
      filename: getRecordingFilename(uri),
      language: voiceLocale,
    } as never)) as { text: string; language?: string; provider: 'cloud' }

    if (sessionId !== activeSessionIdRef.current) {
      return
    }

    await applyTranscript(result.text)
    setVoiceState('idle')
    setVoicePreviewText(undefined)
  }, [
    applyTranscript,
    generateUploadUrl,
    recorder,
    recorderState.url,
    resetAudioSession,
    transcribeAudio,
    voiceLocale,
  ])

  const startCloudRecording = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync()
    if (!permission.granted) {
      throw new Error('Microphone permission is required for voice transcription.')
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    })
    await recorder.prepareToRecordAsync()
    recorder.record()
    setVoiceState('recording')
    setVoicePreviewText(`Recording... ${formatVoiceDuration(0)}`)
  }, [recorder])

  const startDeviceRecognition = useCallback(async () => {
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!permission.granted) {
      throw new Error('Microphone permission is required for voice transcription.')
    }
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      throw new Error(getOnDeviceUnavailableMessage())
    }
    if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) {
      throw new Error(getOnDeviceUnavailableMessage())
    }
    if (!(await supportsLocaleOnDevice(voiceLocale))) {
      throw new Error(
        'On-device recognition is not ready for your current language on this device.',
      )
    }

    deviceAbortExpectedRef.current = false
    deviceStopRequestedRef.current = false
    deviceFinalTranscriptRef.current = ''
    setVoiceState('recording')
    setVoicePreviewText('Listening...')
    ExpoSpeechRecognitionModule.start({
      lang: voiceLocale,
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      requiresOnDeviceRecognition: true,
      addsPunctuation: true,
      iosTaskHint: 'dictation',
    })
  }, [voiceLocale])

  const cancelVoice = useCallback(async () => {
    activeSessionIdRef.current += 1
    setVoiceErrorOverride(null)
    setVoicePreviewText(undefined)
    setVoiceState('idle')

    if (voiceModeRef.current === 'cloud') {
      await discardCloudRecording()
      return
    }

    deviceFinalTranscriptRef.current = ''
    deviceStopRequestedRef.current = false
    deviceAbortExpectedRef.current = true
    ExpoSpeechRecognitionModule.abort()
  }, [discardCloudRecording])

  const handleToggleVoice = useCallback(async () => {
    if (voiceStateRef.current === 'transcribing') {
      return
    }

    if (voiceStateRef.current === 'recording') {
      if (voiceModeRef.current === 'cloud') {
        try {
          await stopCloudRecording()
        } catch (error) {
          setVoiceState('idle')
          setVoicePreviewText(undefined)
          setVoiceErrorOverride(
            getErrorMessage(error, 'Voice transcription failed. Try again.'),
          )
        }
        return
      }

      deviceStopRequestedRef.current = true
      setVoiceState('transcribing')
      setVoicePreviewText('Transcribing...')
      ExpoSpeechRecognitionModule.stop()
      return
    }

    if (availabilityError) {
      setVoiceErrorOverride(availabilityError)
      return
    }

    const sessionId = activeSessionIdRef.current + 1
    activeSessionIdRef.current = sessionId
    setVoiceErrorOverride(null)

    try {
      if (voiceModeRef.current === 'cloud') {
        await startCloudRecording()
      } else {
        await startDeviceRecognition()
      }
    } catch (error) {
      if (sessionId !== activeSessionIdRef.current) {
        return
      }

      setVoiceState('idle')
      setVoicePreviewText(undefined)
      setVoiceErrorOverride(
        getErrorMessage(error, 'Voice transcription failed to start.'),
      )
      await resetAudioSession()
    }
  }, [availabilityError, resetAudioSession, startCloudRecording, startDeviceRecognition, stopCloudRecording])

  useEffect(() => {
    if (
      voiceTranscriptionMode === 'cloud' &&
      voiceState === 'recording' &&
      recorderState.durationMillis >= MAX_CLOUD_RECORDING_MILLIS
    ) {
      void handleToggleVoice()
    }
  }, [
    handleToggleVoice,
    recorderState.durationMillis,
    voiceState,
    voiceTranscriptionMode,
  ])

  useEffect(() => {
    if (voiceTranscriptionMode !== 'cloud' || voiceState !== 'recording') {
      return
    }

    setVoicePreviewText(`Recording... ${formatVoiceDuration(recorderState.durationMillis)}`)
  }, [recorderState.durationMillis, voiceState, voiceTranscriptionMode])

  useEffect(() => {
    return () => {
      void cancelVoice()
    }
  }, [cancelVoice])

  useEffect(() => {
    if (voiceState === 'idle') {
      return
    }

    void cancelVoice()
  }, [cancelVoice, voiceTranscriptionMode])

  useSpeechRecognitionEvent('result', (event: SpeechRecognitionResultEvent) => {
    if (
      voiceModeRef.current !== 'device' ||
      (voiceStateRef.current !== 'recording' &&
        voiceStateRef.current !== 'transcribing')
    ) {
      return
    }

    const transcript = event.results[0]?.transcript?.trim()
    if (!transcript) {
      return
    }

    if (event.isFinal) {
      deviceFinalTranscriptRef.current = transcript
      if (voiceStateRef.current !== 'transcribing') {
        setVoicePreviewText(transcript)
      }
      return
    }

    setVoicePreviewText(transcript)
  })

  useSpeechRecognitionEvent('error', (event: SpeechRecognitionErrorEvent) => {
    if (voiceModeRef.current !== 'device') {
      return
    }

    if (event.error === 'aborted' && deviceAbortExpectedRef.current) {
      deviceAbortExpectedRef.current = false
      return
    }

    deviceStopRequestedRef.current = false
    deviceFinalTranscriptRef.current = ''
    setVoiceState('idle')
    setVoicePreviewText(undefined)

    switch (event.error) {
      case 'not-allowed':
        setVoiceErrorOverride(
          'Microphone and speech recognition permissions are required.',
        )
        return
      case 'language-not-supported':
      case 'service-not-allowed':
        setVoiceErrorOverride(getOnDeviceUnavailableMessage())
        return
      case 'no-speech':
        setVoiceErrorOverride('No speech detected. Try again.')
        return
      default:
        setVoiceErrorOverride(
          event.message?.trim() || 'On-device transcription failed. Try again.',
        )
    }
  })

  useSpeechRecognitionEvent('end', () => {
    if (voiceModeRef.current !== 'device') {
      return
    }

    const finalTranscript = deviceFinalTranscriptRef.current.trim()
    deviceStopRequestedRef.current = false
    deviceAbortExpectedRef.current = false
    deviceFinalTranscriptRef.current = ''

    if (voiceStateRef.current !== 'transcribing') {
      setVoiceState('idle')
      if (!finalTranscript) {
        setVoicePreviewText(undefined)
      }
      return
    }

    if (!finalTranscript) {
      setVoiceState('idle')
      setVoicePreviewText(undefined)
      setVoiceErrorOverride('No speech detected. Try again.')
      return
    }

    void (async () => {
      try {
        await applyTranscript(finalTranscript)
        setVoiceState('idle')
        setVoicePreviewText(undefined)
      } catch (error) {
        setVoiceState('idle')
        setVoicePreviewText(undefined)
        setVoiceErrorOverride(
          getErrorMessage(error, 'Failed to update the draft with voice input.'),
        )
      }
    })()
  })

  return {
    voiceMode: voiceTranscriptionMode,
    voiceState,
    voicePreviewText:
      voiceState === 'transcribing'
        ? 'Transcribing...'
        : voicePreviewText,
    voiceErrorText:
      voiceErrorOverride ?? (voiceState === 'idle' ? availabilityError : null),
    onToggleVoice: handleToggleVoice,
    onCancelVoice: cancelVoice,
    voiceDisabled: voiceState === 'idle' ? Boolean(availabilityError) : false,
    deviceModeSupported,
  }
}
