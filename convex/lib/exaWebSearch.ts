import { createTool } from '@convex-dev/agent'
import { z } from 'zod'

const EXA_SEARCH_ENDPOINT = 'https://api.exa.ai/search'
const DEFAULT_NUM_RESULTS = 5
const MAX_NUM_RESULTS = 10
const TOOL_TIMEOUT_MS = 15_000

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

export const exaWebSearchTool = createTool({
  description:
    'Search the public web for up-to-date information and sources. Returns top results with URLs and short snippets.',
  args: z.object({
    query: z
      .string()
      .min(1)
      .max(500)
      .describe('The search query to look up on the web.'),
    numResults: z
      .number()
      .int()
      .min(1)
      .max(MAX_NUM_RESULTS)
      .optional()
      .describe('Number of results to return (1-10). Defaults to 5.'),
  }),
  handler: async (_ctx, args, options) => {
    const apiKey = process.env.EXA_API_KEY
    const query = args.query.trim()

    if (!apiKey) {
      return {
        ok: false,
        query,
        results: [],
        error: 'EXA_API_KEY is not configured',
      }
    }

    if (!query) {
      return {
        ok: false,
        query: '',
        results: [],
        error: 'Query is required',
      }
    }

    const numResults = clampNumber(
      args.numResults ?? DEFAULT_NUM_RESULTS,
      1,
      MAX_NUM_RESULTS,
    )

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort('timeout'), TOOL_TIMEOUT_MS)
    const abortSignal = options.abortSignal

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
      const response = await fetch(EXA_SEARCH_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          query,
          numResults,
          contents: { highlights: { numSentences: 2, highlightsPerUrl: 1 } },
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        return {
          ok: false,
          query,
          results: [],
          error: `Exa API error: ${response.status}`,
        }
      }

      const data: any = await response.json()
      const rawResults: any[] = Array.isArray(data?.results) ? data.results : []

      const results = rawResults
        .map((r) => {
          const url = typeof r?.url === 'string' ? r.url : undefined
          if (!url) return null

          const highlights: unknown = r?.highlights
          const snippet =
            Array.isArray(highlights) && typeof highlights[0] === 'string'
              ? highlights[0]
              : undefined

          return {
            title: typeof r?.title === 'string' ? r.title : undefined,
            url,
            snippet,
            publishedDate:
              typeof r?.publishedDate === 'string'
                ? r.publishedDate
                : typeof r?.published_date === 'string'
                  ? r.published_date
                  : undefined,
          }
        })
        .filter(Boolean)
        .slice(0, numResults)

      return { ok: true, query, results }
    } catch (error) {
      return { ok: false, query, results: [], error: errorToMessage(error) }
    } finally {
      clearTimeout(timeout)
    }
  },
})

