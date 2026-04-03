import { createTool } from '@convex-dev/agent'
import { z } from 'zod'

const QURAN_API_BASE_URL = 'https://api.quran.com/api/v4'
const QURAN_VERSE_AUDIO_BASE_URL = 'https://verses.quran.foundation/'
const DEFAULT_TRANSLATIONS = [20]
const DEFAULT_SEARCH_LANGUAGE = 'en'
const DEFAULT_SEARCH_SIZE = 3
const MAX_SEARCH_SIZE = 5
const TOOL_TIMEOUT_MS = 15_000
const DEFAULT_RECITATION_ID = 7

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
  }
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function buildVerseUrl(verseKey: string) {
  const [chapter, verse] = verseKey.split(':')
  if (!chapter || !verse) {
    return `${QURAN_API_BASE_URL}/verses/by_key/${encodeURIComponent(verseKey)}`
  }
  return `https://quran.com/${chapter}/${verse}`
}

function normalizeVerseAudioUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value
  }

  return new URL(value.replace(/^\/+/, ''), QURAN_VERSE_AUDIO_BASE_URL).toString()
}

function getVerseKeyFromLooseInput(value?: string) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return undefined
  }

  const match = trimmed.match(/\b(\d+:\d+)\b/)
  return match?.[1]
}

function getWordTranslationText(words: unknown) {
  if (!Array.isArray(words)) {
    return ''
  }

  return words
    .map((word) => {
      if (!word || typeof word !== 'object') return ''
      const translation =
        'translation' in word && word.translation && typeof word.translation === 'object'
          ? word.translation
          : null
      return translation &&
        'text' in translation &&
        typeof translation.text === 'string'
        ? translation.text
        : ''
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchJson(path: string, abortSignal?: AbortSignal) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('timeout'), TOOL_TIMEOUT_MS)

  if (abortSignal) {
    if (abortSignal.aborted) {
      controller.abort(abortSignal.reason)
    } else {
      abortSignal.addEventListener(
        'abort',
        () => controller.abort(abortSignal.reason),
        { once: true },
      )
    }
  }

  try {
    const response = await fetch(`${QURAN_API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'chat-quran-source-tool/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Quran API request failed: ${response.status}`)
    }

    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchVerseAudioUrl(
  verseKey: string,
  abortSignal?: AbortSignal,
) {
  const data = (await fetchJson(
    `/recitations/${DEFAULT_RECITATION_ID}/by_ayah/${encodeURIComponent(verseKey)}`,
    abortSignal,
  )) as {
    audio_files?: Array<{
      verse_key?: string
      url?: string
    }>
  }

  const audioPath = data.audio_files?.find(
    (file) => file?.verse_key === verseKey && typeof file.url === 'string',
  )?.url

  return audioPath ? normalizeVerseAudioUrl(audioPath) : undefined
}

const quranSourceInputSchema = z
  .object({
    verseKey: z
      .string()
      .regex(/^\d+:\d+$/)
      .optional()
      .describe('A verse key like "2:255". Use this when the user asks for a specific ayah.'),
    query: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .describe('A Quran search query like "mercy" or "light".'),
    translations: z
      .array(z.number().int().positive())
      .max(3)
      .optional()
      .describe('Optional translation resource ids. Defaults to [20].'),
    includeWords: z
      .boolean()
      .optional()
      .describe('Include word-level translation text for specific verse lookups.'),
    language: z
      .string()
      .min(2)
      .max(10)
      .optional()
      .describe('Search language for query search. Defaults to "en".'),
    size: z
      .number()
      .int()
      .min(1)
      .max(MAX_SEARCH_SIZE)
      .optional()
      .describe('Maximum number of search results. Defaults to 3.'),
  })
  .refine((value) => Boolean(value.verseKey || value.query), {
    message: 'Provide either verseKey or query.',
  })

export const quranSourceTool = createTool({
  description:
    'Fetch verified Quran content from the Quran.com API. Use this for ayahs, verse lookups, topical Quran search, verse text, and translations. Do not answer Quran content questions from memory when this tool should be used.',
  inputSchema: quranSourceInputSchema,
  execute: async (_ctx, args, options) => {
    const translations = args.translations?.length
      ? args.translations
      : DEFAULT_TRANSLATIONS
    const resolvedVerseKey = args.verseKey ?? getVerseKeyFromLooseInput(args.query)

    try {
      if (resolvedVerseKey) {
        const params = new URLSearchParams({
          words: String(args.includeWords ?? true),
          translations: translations.join(','),
          fields: 'text_uthmani,verse_key',
        })

        const [data, audioUrl] = await Promise.all([
          fetchJson(
            `/verses/by_key/${encodeURIComponent(resolvedVerseKey)}?${params.toString()}`,
            options.abortSignal,
          ) as Promise<{
            verse?: {
              verse_key?: string
              text_uthmani?: string
              translations?: Array<{
                text?: string
                resource_id?: number
              }>
              words?: unknown
              juz_number?: number
              page_number?: number
            }
          }>,
          fetchVerseAudioUrl(resolvedVerseKey, options.abortSignal).catch(() => undefined),
        ])

        const verse = data.verse
        if (!verse?.verse_key) {
          return {
            ok: false,
            mode: 'verse',
            verseKey: resolvedVerseKey,
            results: [],
            error: 'Verse not found',
          }
        }

        const primaryTranslation = verse.translations?.[0]
        const translationText =
          typeof primaryTranslation?.text === 'string'
            ? stripHtml(primaryTranslation.text)
            : ''
        const wordTranslationText = getWordTranslationText(verse.words)
        const snippet = [translationText, wordTranslationText]
          .filter(Boolean)
          .join(' ')
          .trim()
        const sourceUrl = buildVerseUrl(verse.verse_key)

        return {
          ok: true,
          mode: 'verse',
          verseKey: verse.verse_key,
          arabic: verse.text_uthmani ?? '',
          translation: translationText,
          translationResourceId: primaryTranslation?.resource_id,
          ...(audioUrl ? { audioUrl } : {}),
          ayahCard: {
            type: 'quran-ayah',
            verseKey: verse.verse_key,
            arabic: verse.text_uthmani ?? '',
            ...(audioUrl ? { audioUrl } : {}),
            sourceUrl,
          },
          metadata: {
            juzNumber: verse.juz_number,
            pageNumber: verse.page_number,
          },
          results: [
            {
              title: `Quran ${verse.verse_key}`,
              url: sourceUrl,
              snippet: snippet || verse.text_uthmani || verse.verse_key,
            },
          ],
        }
      }

      const query = args.query?.trim() || ''
      const size = clampNumber(args.size ?? DEFAULT_SEARCH_SIZE, 1, MAX_SEARCH_SIZE)
      const language = (args.language?.trim() || DEFAULT_SEARCH_LANGUAGE).toLowerCase()
      const params = new URLSearchParams({
        q: query,
        size: String(size),
        page: '1',
        language,
      })

      const data = (await fetchJson(
        `/search?${params.toString()}`,
        options.abortSignal,
      )) as {
        search?: {
          query?: string
          results?: Array<{
            verse_key?: string
            text?: string
            translations?: Array<{
              text?: string
              name?: string
            }>
          }>
        }
      }

      const results = (data.search?.results ?? [])
        .map((result) => {
          const verseKey = result.verse_key
          if (!verseKey) return null
          const primaryTranslation = result.translations?.[0]
          const translationText =
            typeof primaryTranslation?.text === 'string'
              ? stripHtml(primaryTranslation.text)
              : ''

          return {
            verseKey,
            arabic: result.text ?? '',
            translation: translationText,
            translator: primaryTranslation?.name,
            title: `Quran ${verseKey}`,
            url: buildVerseUrl(verseKey),
            snippet: translationText || result.text || verseKey,
          }
        })
        .filter((result): result is NonNullable<typeof result> => result !== null)

      const singleResult = results.length === 1 ? results[0] : null

      return {
        ok: true,
        mode: 'search',
        query,
        language,
        ...(singleResult
          ? {
              ayahCard: {
                type: 'quran-ayah',
                verseKey: singleResult.verseKey,
                arabic: singleResult.arabic,
                sourceUrl: singleResult.url,
              },
            }
          : {}),
        results,
      }
    } catch (error) {
      return {
        ok: false,
        mode: resolvedVerseKey ? 'verse' : 'search',
        verseKey: resolvedVerseKey,
        query: args.query?.trim(),
        results: [],
        error: errorToMessage(error),
      }
    }
  },
})
