import { ConvexError, v } from 'convex/values'
import { api } from './_generated/api'
import { action, mutation } from './_generated/server'
import { getAuthUserId } from './lib/auth'

const DEFAULT_TRANSCRIPTION_MODEL = 'gpt-4o-mini-transcribe'
const MAX_AUDIO_BYTES = 25 * 1024 * 1024
const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/mpga',
  'audio/mp3',
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/x-pn-wav',
  'audio/aac',
  'audio/x-m4a',
  'audio/x-caf',
  'audio/ogg',
  'audio/oga',
  'audio/flac',
  'audio/x-flac',
  'audio/3gpp',
  'audio/3gp',
] as const

function voiceError(
  code: 'unauthorized' | 'unsupported_format' | 'file_too_large' | 'transcription_failed',
  message: string,
) {
  return new ConvexError({ code, message })
}

function isSupportedAudioMimeType(mimeType: string) {
  const normalized = mimeType.trim().toLowerCase()
  return SUPPORTED_AUDIO_MIME_TYPES.includes(
    normalized as (typeof SUPPORTED_AUDIO_MIME_TYPES)[number],
  )
}

function ensureVoiceApiKey() {
  const apiKey = process.env.VOICE_TRANSCRIPTION_API_KEY?.trim()
  if (!apiKey) {
    console.error('[voice-transcription] missing VOICE_TRANSCRIPTION_API_KEY environment variable')
    throw voiceError('transcription_failed', 'Voice transcription is unavailable right now.')
  }
  return apiKey
}

function resolveVoiceModel() {
  return process.env.VOICE_TRANSCRIPTION_MODEL?.trim() || DEFAULT_TRANSCRIPTION_MODEL
}

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw voiceError('unauthorized', 'Please sign in to use voice transcription.')
    }

    return await ctx.storage.generateUploadUrl()
  },
})

export const transcribeAudio = action({
  args: {
    storageId: v.id('_storage'),
    mimeType: v.string(),
    filename: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  returns: v.object({
    text: v.string(),
    language: v.optional(v.string()),
    provider: v.literal('cloud'),
  }),
  handler: async (ctx, args) => {
    const viewer = await ctx.runQuery(api.users.viewer, {})
    if (!viewer?._id) {
      throw voiceError('unauthorized', 'Please sign in to use voice transcription.')
    }

    const normalizedMimeType = args.mimeType.trim().toLowerCase()
    if (!isSupportedAudioMimeType(normalizedMimeType)) {
      throw voiceError(
        'unsupported_format',
        'This audio format is not supported for transcription.',
      )
    }

    try {
      const [blob, metadata] = await Promise.all([
        ctx.storage.get(args.storageId),
        ctx.storage.getMetadata(args.storageId),
      ])

      if (!blob || !metadata) {
        console.error('[voice-transcription] uploaded audio was missing', args.storageId)
        throw voiceError('transcription_failed', 'Voice transcription failed. Try again.')
      }

      const sizeBytes = metadata.size ?? blob.size
      if (sizeBytes > MAX_AUDIO_BYTES) {
        throw voiceError('file_too_large', 'Voice recording is too large to transcribe.')
      }

      const apiKey = ensureVoiceApiKey()
      const model = resolveVoiceModel()
      const formData = new FormData()
      formData.append(
        'file',
        blob,
        args.filename?.trim() || `voice-input.${normalizedMimeType.split('/')[1] || 'm4a'}`,
      )
      formData.append('model', model)
      if (args.language?.trim()) {
        formData.append('language', args.language.trim())
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const failureText = await response.text()
        console.error('[voice-transcription] provider status', response.status, failureText)
        throw voiceError('transcription_failed', 'Voice transcription failed. Try again.')
      }

      const payload = (await response.json()) as {
        text?: string
        language?: string
      }
      console.log('[voice-transcription] provider status', response.status)

      const text = payload.text?.trim()
      if (!text) {
        console.error('[voice-transcription] provider returned empty transcript')
        throw voiceError('transcription_failed', 'Voice transcription failed. Try again.')
      }

      return {
        text,
        language: payload.language?.trim() || undefined,
        provider: 'cloud' as const,
      }
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error
      }

      console.error('[voice-transcription] transcription_failed', error)
      throw voiceError('transcription_failed', 'Voice transcription failed. Try again.')
    } finally {
      try {
        await ctx.storage.delete(args.storageId)
      } catch (error) {
        console.warn('[voice-transcription] failed to delete temp audio', args.storageId, error)
      }
    }
  },
})
