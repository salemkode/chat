import { Check, Copy } from '@/lib/icons'
import React, {
  Children,
  Suspense,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  type BundledLanguage,
  type BundledTheme,
  createHighlighter,
} from 'shiki/bundle/web'
import { useTheme } from '@/components/theme-provider'
import { fnv1a32 } from '@/lib/fnv1a32'
import { LRUCache } from '@/lib/lruCache'
import { cn } from '@/lib/utils'

export interface ChatMarkdownProps {
  text: string
  /** When true, highlighted HTML is not written to the LRU cache (matches T3 Code behavior). */
  isStreaming?: boolean
  className?: string
}

const CODE_FENCE_LANGUAGE_REGEX = /(?:^|\s)language-([^\s]+)/
const MAX_HIGHLIGHT_CACHE_ENTRIES = 500
const MAX_HIGHLIGHT_CACHE_MEMORY_BYTES = 50 * 1024 * 1024

const highlightedCodeCache = new LRUCache<string>(
  MAX_HIGHLIGHT_CACHE_ENTRIES,
  MAX_HIGHLIGHT_CACHE_MEMORY_BYTES,
)
type ShikiHighlighter = Awaited<ReturnType<typeof createHighlighter>>
const highlighterPromiseCache = new Map<string, Promise<ShikiHighlighter>>()

function extractFenceLanguage(
  className: string | undefined,
): { language: string; label: string } {
  const match = className?.match(CODE_FENCE_LANGUAGE_REGEX)
  const raw = match?.[1] ?? 'text'
  // Shiki doesn't bundle gitignore grammar; ini is a close fallback.
  if (raw === 'gitignore') {
    return { language: 'ini', label: 'gitignore' }
  }

  return { language: raw, label: raw }
}

function nodeToPlainText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map((child) => nodeToPlainText(child)).join('')
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return nodeToPlainText(node.props.children)
  }
  return ''
}

function extractCodeBlock(
  children: ReactNode,
): { className: string | undefined; code: string } | null {
  const childNodes = Children.toArray(children)
  if (childNodes.length !== 1) {
    return null
  }

  const onlyChild = childNodes[0]
  if (
    !isValidElement<{ className?: string; children?: ReactNode }>(onlyChild) ||
    onlyChild.type !== 'code'
  ) {
    return null
  }

  return {
    className: onlyChild.props.className,
    code: nodeToPlainText(onlyChild.props.children),
  }
}

function createHighlightCacheKey(code: string, language: string, themeName: BundledTheme): string {
  return `${fnv1a32(code).toString(36)}:${code.length}:${language}:${themeName}`
}

function estimateHighlightedSize(html: string, code: string): number {
  return Math.max(html.length * 2, code.length * 3)
}

function getHighlighterPromise(language: string): Promise<ShikiHighlighter> {
  const cached = highlighterPromiseCache.get(language)
  if (cached) return cached

  const promise = createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: [language as BundledLanguage],
  }).catch((err) => {
    highlighterPromiseCache.delete(language)
    if (language === 'text') {
      throw err
    }
    return getHighlighterPromise('text')
  })

  highlighterPromiseCache.set(language, promise)
  return promise
}

class CodeHighlightErrorBoundary extends React.Component<
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

function MarkdownCodeBlock({
  code,
  children,
  languageLabel,
}: {
  code: string
  children: ReactNode
  languageLabel: string
}) {
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCopy = useCallback(() => {
    if (typeof navigator === 'undefined' || navigator.clipboard == null) {
      return
    }
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        if (copiedTimerRef.current != null) {
          clearTimeout(copiedTimerRef.current)
        }
        setCopied(true)
        copiedTimerRef.current = setTimeout(() => {
          setCopied(false)
          copiedTimerRef.current = null
        }, 1200)
      })
      .catch(() => undefined)
  }, [code])

  useEffect(
    () => () => {
      if (copiedTimerRef.current != null) {
        clearTimeout(copiedTimerRef.current)
        copiedTimerRef.current = null
      }
    },
    [],
  )

  return (
    <div className="chat-markdown-codeblock not-prose relative my-3 overflow-hidden rounded-xl border border-border/60 bg-sidebar/85 shadow-sm">
      <span className="pointer-events-none absolute top-2 left-3 z-10 inline-flex h-6 items-center rounded-md border border-border/60 bg-background/85 px-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {languageLabel}
      </span>
      <button
        type="button"
        className="chat-markdown-copy-button absolute top-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground opacity-0 transition-colors hover:bg-muted hover:text-foreground"
        onClick={handleCopy}
        title={copied ? 'Copied' : 'Copy code'}
        aria-label={copied ? 'Copied' : 'Copy code'}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      <div className="overflow-x-auto pt-10 pb-4 [&_.shiki]:bg-transparent! [&_pre]:m-0! [&_pre]:bg-transparent! [&_pre]:px-4! [&_pre]:py-0! [&_pre]:text-[13px]">
        {children}
      </div>
    </div>
  )
}

function SuspenseShikiCodeBlock({
  language,
  code,
  themeName,
  isStreaming,
}: {
  language: string
  code: string
  themeName: BundledTheme
  isStreaming: boolean
}) {
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
        lang: 'text' as BundledLanguage,
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

function resolveShikiTheme(resolved: 'light' | 'dark'): BundledTheme {
  return resolved === 'dark' ? 'github-dark' : 'github-light'
}

/**
 * Prevent accidental indented "filename labels" from becoming one-line code blocks.
 * Markdown interprets 4+ leading spaces as an indented code block.
 */
function normalizeAccidentalIndentedFilenameLabels(markdown: string) {
  const lines = markdown.split('\n')
  let inFence = false

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const trimmed = line.trimStart()
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence
      continue
    }
    if (inFence) {
      continue
    }
    if (!/^\s{4,}/.test(line)) {
      continue
    }
    if (!/^['"`]?[A-Za-z0-9_./-]+['"`]?:\s*$/.test(trimmed)) {
      continue
    }

    const nextLine = lines[i + 1]?.trimStart()
    if (nextLine?.startsWith('```') || nextLine?.startsWith('~~~')) {
      lines[i] = trimmed
    }
  }

  return lines.join('\n')
}

export const ChatMarkdown = React.memo(function ChatMarkdown({
  text,
  isStreaming = false,
  className,
}: ChatMarkdownProps) {
  const { resolvedTheme } = useTheme()
  const shikiTheme = resolveShikiTheme(resolvedTheme)
  const normalizedText = useMemo(
    () => normalizeAccidentalIndentedFilenameLabels(text),
    [text],
  )

  const markdownComponents = useMemo<Components>(
    () => ({
      a({ href, children, ...props }) {
        const external = typeof href === 'string' && /^https?:\/\//i.test(href)
        return (
          <a
            {...props}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {children}
          </a>
        )
      },
      pre({ children, ...props }) {
        const codeBlock = extractCodeBlock(children)
        if (!codeBlock) {
          return <pre {...props}>{children}</pre>
        }
        const fenceLanguage = extractFenceLanguage(codeBlock.className)

        return (
          <MarkdownCodeBlock
            code={codeBlock.code}
            languageLabel={fenceLanguage.label}
          >
            <CodeHighlightErrorBoundary
              fallback={<pre {...props}>{children}</pre>}
            >
              <Suspense fallback={<pre {...props}>{children}</pre>}>
                <SuspenseShikiCodeBlock
                  language={fenceLanguage.language}
                  code={codeBlock.code}
                  themeName={shikiTheme}
                  isStreaming={isStreaming}
                />
              </Suspense>
            </CodeHighlightErrorBoundary>
          </MarkdownCodeBlock>
        )
      },
    }),
    [isStreaming, shikiTheme],
  )

  return (
    <div
      className={cn(
        'chat-markdown w-full min-w-0 max-w-none overflow-hidden text-foreground/90 wrap-anywhere',
        'prose prose-sm dark:prose-invert',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalizedText}
      </ReactMarkdown>
      <style>{`
        .chat-markdown-codeblock:hover .chat-markdown-copy-button,
        .chat-markdown-codeblock:focus-within .chat-markdown-copy-button {
          opacity: 1;
        }
      `}</style>
    </div>
  )
})
