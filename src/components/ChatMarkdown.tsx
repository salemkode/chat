import { Check, Copy } from 'lucide-react'
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
  codeToHtml,
  type BundledLanguage,
  type BundledTheme,
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

function extractFenceLanguage(className: string | undefined): string {
  const match = className?.match(CODE_FENCE_LANGUAGE_REGEX)
  const raw = match?.[1] ?? 'text'
  return raw === 'gitignore' ? 'ini' : raw
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function highlightToHtml(
  code: string,
  lang: string,
  theme: BundledTheme,
): Promise<string> {
  try {
    return await codeToHtml(code, { lang: lang as BundledLanguage, theme })
  } catch {
    return `<pre class="chat-markdown-fallback-pre" tabindex="0"><code>${escapeHtml(code)}</code></pre>`
  }
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

function MarkdownCodeBlock({ code, children }: { code: string; children: ReactNode }) {
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
    <div className="not-prose relative my-3 overflow-hidden rounded-xl border border-border/60 bg-sidebar/85 shadow-sm">
      <button
        type="button"
        className="absolute top-2 right-2 z-10 inline-flex size-8 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={handleCopy}
        title={copied ? 'Copied' : 'Copy code'}
        aria-label={copied ? 'Copied' : 'Copy code'}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      <div className="overflow-x-auto pt-10 pb-4 [&_.shiki]:bg-transparent! [&_pre]:m-0! [&_pre]:bg-transparent! [&_pre]:p-4! [&_pre]:text-[13px]">
        {children}
      </div>
    </div>
  )
}

function SuspenseShikiCodeBlock({
  className,
  code,
  themeName,
  isStreaming,
}: {
  className: string | undefined
  code: string
  themeName: BundledTheme
  isStreaming: boolean
}) {
  const language = extractFenceLanguage(className)
  const cacheKey = createHighlightCacheKey(code, language, themeName)
  const cachedHighlightedHtml = !isStreaming ? highlightedCodeCache.get(cacheKey) : null

  if (cachedHighlightedHtml != null) {
    return (
      <div
        className="[&_.shiki]:bg-transparent! [&_pre]:m-0! [&_pre]:bg-transparent! [&_pre]:p-0!"
        dangerouslySetInnerHTML={{ __html: cachedHighlightedHtml }}
      />
    )
  }

  const highlightPromise = useMemo(
    () => highlightToHtml(code, language, themeName),
    [code, language, themeName],
  )
  const highlightedHtml = use(highlightPromise)

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
      className="[&_.shiki]:bg-transparent! [&_pre]:m-0! [&_pre]:bg-transparent! [&_pre]:p-0!"
      dangerouslySetInnerHTML={{ __html: highlightedHtml }}
    />
  )
}

function resolveShikiTheme(resolved: 'light' | 'dark'): BundledTheme {
  return resolved === 'dark' ? 'github-dark' : 'github-light'
}

export const ChatMarkdown = React.memo(function ChatMarkdown({
  text,
  isStreaming = false,
  className,
}: ChatMarkdownProps) {
  const { resolvedTheme } = useTheme()
  const shikiTheme = resolveShikiTheme(resolvedTheme)

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

        return (
          <MarkdownCodeBlock code={codeBlock.code}>
            <CodeHighlightErrorBoundary
              fallback={<pre {...props}>{children}</pre>}
            >
              <Suspense fallback={<pre {...props}>{children}</pre>}>
                <SuspenseShikiCodeBlock
                  className={codeBlock.className}
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
        {text}
      </ReactMarkdown>
    </div>
  )
})
