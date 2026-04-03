export type VoiceTranscriptionMode = 'cloud' | 'device'
export type VoiceComposerState = 'idle' | 'recording' | 'transcribing'

export function appendVoiceTranscript(draft: string, transcript: string) {
  const normalizedTranscript = transcript.trim()
  if (!normalizedTranscript) {
    return draft
  }

  const normalizedDraft = draft.trim()
  return normalizedDraft ? `${draft}\n${normalizedTranscript}` : normalizedTranscript
}

export function formatVoiceDuration(durationMillis: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMillis / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function getDefaultVoiceLocale() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    return (locale || 'en-US').replace('_', '-')
  } catch {
    return 'en-US'
  }
}

export function getRecordingMimeType(uri: string) {
  const normalized = uri.toLowerCase()
  if (normalized.endsWith('.wav')) return 'audio/wav'
  if (normalized.endsWith('.webm')) return 'audio/webm'
  if (normalized.endsWith('.caf')) return 'audio/x-caf'
  if (normalized.endsWith('.mp3')) return 'audio/mpeg'
  if (normalized.endsWith('.aac')) return 'audio/aac'
  if (normalized.endsWith('.ogg') || normalized.endsWith('.oga')) return 'audio/ogg'
  if (normalized.endsWith('.3gp')) return 'audio/3gpp'
  if (normalized.endsWith('.m4a') || normalized.endsWith('.mp4')) return 'audio/mp4'
  return 'audio/mp4'
}

export function getRecordingFilename(uri: string) {
  const cleaned = uri.split('?')[0] || ''
  const parts = cleaned.split('/')
  return parts[parts.length - 1] || 'voice-input.m4a'
}
