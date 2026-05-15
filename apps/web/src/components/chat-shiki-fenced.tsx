import { useTheme } from '@/components/theme-provider'
import { fnv1a32 } from '@/lib/fnv1a32'
import { LRUCache } from '@/lib/lruCache'
import { Component, use, useEffect, useMemo, type ReactNode } from 'react'
import { type BundledLanguage, type BundledTheme, createHighlighter } from 'shiki/bundle/web'

const MAX_HIGHLIGHT_CACHE_ENTRIES = 500
const MAX_HIGHLIGHT_CACHE_MEMORY_BYTES = 50 * 1024 * 1024

const highlightedCodeCache = new LRUCache<string>(
  MAX_HIGHLIGHT_CACHE_ENTRIES,
  MAX_HIGHLIGHT_CACHE_MEMORY_BYTES,
)

type ShikiHighlighter = Awaited<ReturnType<typeof createHighlighter>>
const highlighterPromiseCache = new Map<string, Promise<ShikiHighlighter>>()

function createHighlightCacheKey(code: string, language: string, themeName: BundledTheme): string {
  return `${fnv1a32(code).toString(36)}:${code.length}:${language}:${themeName}`
}

function estimateHighlightedSize(html: string, code: string): number {
  return Math.max(html.length * 2, code.length * 3)
}

function getHighlighterPromise(language: string): Promise<ShikiHighlighter> {
  const cached = highlighterPromiseCache.get(language)
  if (cached) {
    return cached
  }

  const promise = createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: [language as BundledLanguage],
  }).catch((err: unknown) => {
    highlighterPromiseCache.delete(language)
    if (language === 'text') {
      throw err
    }
    return getHighlighterPromise('text')
  })

  highlighterPromiseCache.set(language, promise)
  return promise
}

function resolveShikiTheme(resolved: 'light' | 'dark'): BundledTheme {
  return resolved === 'dark' ? 'github-dark' : 'github-light'
}

export class CodeHighlightErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export function SuspenseShikiCodeBlock({
  language,
  code,
  isStreaming,
}: {
  language: string
  code: string
  isStreaming: boolean
}) {
  const { resolvedTheme } = useTheme()
  const themeName = resolveShikiTheme(resolvedTheme)
  const cacheKey = createHighlightCacheKey(code, language, themeName)
  const cachedHighlightedHtml = !isStreaming ? highlightedCodeCache.get(cacheKey) : null

  if (cachedHighlightedHtml != null) {
    return (
      <div
        className="chat-markdown-shiki [&_.shiki]:bg-transparent! [&_pre]:m-0! [&_pre]:bg-transparent! [&_pre]:p-0!"
        dangerouslySetInnerHTML={{ __html: cachedHighlightedHtml }}
      />
    )
  }

  const highlighter = use(getHighlighterPromise(language))
  const highlightedHtml = useMemo(() => {
    try {
      return highlighter.codeToHtml(code, {
        lang: language as BundledLanguage,
        theme: themeName,
      })
    } catch {
      return highlighter.codeToHtml(code, {
        lang: 'text',
        theme: themeName,
      })
    }
  }, [code, highlighter, language, themeName])

  useEffect(() => {
    if (!isStreaming) {
      highlightedCodeCache.set(
        cacheKey,
        highlightedHtml,
        estimateHighlightedSize(highlightedHtml, code),
      )
    }
  }, [cacheKey, code, highlightedHtml, isStreaming])

  return (
    <div
      className="chat-markdown-shiki [&_.shiki]:bg-transparent! [&_pre]:m-0! [&_pre]:bg-transparent! [&_pre]:p-0!"
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
    />
  )
}

export function ShikiCodeFallback({ code }: { code: string }) {
  return (
    <pre className="m-0 whitespace-pre-wrap px-4 font-mono text-[13px] leading-relaxed text-foreground/90">
      {code}
    </pre>
  )
}
