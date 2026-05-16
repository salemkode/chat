import { createTool } from '@convex-dev/agent'
import { z } from 'zod'

const TOOL_TIMEOUT_MS = 15_000
const CACHE_TTL_MS = 10 * 60 * 1000
const DEFAULT_NUM_RESULTS = 3
const MAX_NUM_RESULTS = 5

const QURAN_DOC_PAGES = [
  {
    title: 'Getting Started',
    description: 'Install and configure @quranjs/api and create a QuranClient.',
    url: 'https://quranjs.com/docs',
  },
  {
    title: 'Audio API',
    description: 'Fetch recitations and audio-related Quran data.',
    url: 'https://quranjs.com/docs/audio',
  },
  {
    title: 'Chapters API',
    description: 'Work with surahs and chapter metadata.',
    url: 'https://quranjs.com/docs/chapters',
  },
  {
    title: 'Juzs API',
    description: 'Work with ajza and juz metadata.',
    url: 'https://quranjs.com/docs/juzs',
  },
  {
    title: 'Resources API',
    description: 'Fetch reciters, translations, tafsir, and related resources.',
    url: 'https://quranjs.com/docs/resources',
  },
  {
    title: 'Search API',
    description: 'Search Quran text and related query options.',
    url: 'https://quranjs.com/docs/search',
  },
  {
    title: 'Verses API',
    description: 'Fetch ayahs, verse keys, words, translations, and more.',
    url: 'https://quranjs.com/docs/verses',
  },
  {
    title: 'Migration Guide',
    description: 'Migrate from quranjs v1 to v2.',
    url: 'https://quranjs.com/docs/v1-migration-guide',
  },
] as const

type QuranDocPage = (typeof QURAN_DOC_PAGES)[number]

const pageCache = new Map<
  string,
  {
    fetchedAt: number
    text: string
  }
>()

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

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
  // Numeric entities are uncommon in these docs and can be added later if needed.
}

function stripHtml(value: string) {
  return normalizeWhitespace(
    decodeHtmlEntities(
      value
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
        .replace(/<[^>]+>/g, ' '),
    ),
  )
}

function buildSnippet(text: string, terms: string[]) {
  const lower = text.toLowerCase()
  let matchIndex = -1

  for (const term of terms) {
    const index = lower.indexOf(term)
    if (index !== -1 && (matchIndex === -1 || index < matchIndex)) {
      matchIndex = index
    }
  }

  if (matchIndex === -1) {
    return text.slice(0, 220).trim()
  }

  const start = Math.max(0, matchIndex - 80)
  const end = Math.min(text.length, matchIndex + 180)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return `${prefix}${text.slice(start, end).trim()}${suffix}`
}

function getQueryTerms(query: string) {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9@._:-]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2),
    ),
  )
}

function countOccurrences(haystack: string, needle: string) {
  if (!needle) return 0
  let count = 0
  let index = 0

  while (index < haystack.length) {
    const found = haystack.indexOf(needle, index)
    if (found === -1) {
      break
    }
    count += 1
    index = found + needle.length
  }

  return count
}

function scorePage(page: QuranDocPage, text: string, query: string, terms: string[]) {
  const title = page.title.toLowerCase()
  const description = page.description.toLowerCase()
  const body = text.toLowerCase()
  const normalizedQuery = query.toLowerCase()

  let score = 0

  if (normalizedQuery && title.includes(normalizedQuery)) score += 20
  if (normalizedQuery && description.includes(normalizedQuery)) score += 10
  if (normalizedQuery && body.includes(normalizedQuery)) score += 6

  for (const term of terms) {
    score += countOccurrences(title, term) * 8
    score += countOccurrences(description, term) * 4
    score += Math.min(6, countOccurrences(body, term))
  }

  return score
}

async function fetchPageText(page: QuranDocPage, abortSignal?: AbortSignal) {
  const cached = pageCache.get(page.url)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.text
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('timeout'), TOOL_TIMEOUT_MS)

  if (abortSignal) {
    if (abortSignal.aborted) {
      controller.abort(abortSignal.reason)
    } else {
      abortSignal.addEventListener('abort', () => controller.abort(abortSignal.reason), {
        once: true,
      })
    }
  }

  try {
    const response = await fetch(page.url, {
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'chat-quran-docs-tool/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`QuranJS docs request failed: ${response.status}`)
    }

    const html = await response.text()
    const text = stripHtml(html)
    pageCache.set(page.url, {
      fetchedAt: Date.now(),
      text,
    })
    return text
  } finally {
    clearTimeout(timeout)
  }
}

export const quranDocsTool = createTool({
  description:
    'Search the official QuranJS documentation for Quran.com API, QuranJS client usage, verses, chapters, search, audio, resources, and v1-to-v2 migration details. Only use this for Quran or QuranJS related requests.',
  inputSchema: z.object({
    query: z.string().min(1).max(500).describe('What to look up in the QuranJS documentation.'),
    numResults: z
      .number()
      .int()
      .min(1)
      .max(MAX_NUM_RESULTS)
      .optional()
      .describe('Number of matching docs pages to return. Defaults to 3.'),
  }),
  execute: async (_ctx, args, options) => {
    const query = args.query.trim()

    if (!query) {
      return {
        ok: false,
        query: '',
        results: [],
        error: 'Query is required',
      }
    }

    const terms = getQueryTerms(query)
    const numResults = clampNumber(args.numResults ?? DEFAULT_NUM_RESULTS, 1, MAX_NUM_RESULTS)

    try {
      const pages = await Promise.all(
        QURAN_DOC_PAGES.map(async (page) => {
          const text = await fetchPageText(page, options.abortSignal)
          return {
            ...page,
            text,
            score: scorePage(page, text, query, terms),
          }
        }),
      )

      const results = pages
        .filter((page) => page.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, numResults)
        .map((page) => ({
          title: page.title,
          url: page.url,
          snippet: buildSnippet(page.text, terms),
          description: page.description,
        }))

      return {
        ok: true,
        query,
        results,
      }
    } catch (error) {
      return {
        ok: false,
        query,
        results: [],
        error: errorToMessage(error),
      }
    }
  },
})
