import { ChatFencedCodeBlock } from '@/components/chat-fenced-code-block'
import { ChatMermaidViewer } from '@/components/chat-mermaid-viewer'
import { useChatMarkdownIsStreaming } from '@/components/chat-markdown-render-context'
import {
  CodeHighlightErrorBoundary,
  ShikiCodeFallback,
  SuspenseShikiCodeBlock,
} from '@/components/chat-shiki-fenced'
import { useTheme } from '@/components/theme-provider'
import { getFencedBlockDirection } from '@/lib/fenced-block-direction'
import { cn } from '@/lib/utils'
import { memo, Suspense, type ComponentProps, type ReactNode } from 'react'
import type { ExtraProps } from 'streamdown'

const CODE_FENCE_LANGUAGE_REGEX = /(?:^|\s)language-([^\s]+)/

function extractFenceLanguage(className: string | undefined): {
  highlightLanguage: string
  label: string
} {
  const match = className?.match(CODE_FENCE_LANGUAGE_REGEX)
  const raw = match?.[1] ?? 'text'
  if (raw === 'gitignore') {
    return { highlightLanguage: 'ini', label: 'gitignore' }
  }
  return { highlightLanguage: raw, label: raw }
}

function nodeToPlainText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map((child) => nodeToPlainText(child)).join('')
  }
  if (node !== null && typeof node === 'object' && 'props' in node) {
    const props = node.props as { children?: ReactNode }
    return nodeToPlainText(props.children)
  }
  return ''
}

/** Model output sometimes includes literal `` ` `` around text already inside an inline `code` node. */
function stripRedundantInlineCodeBackticks(text: string): string {
  let s = text
  let guard = 0
  while (s.length >= 2 && s.startsWith('`') && s.endsWith('`') && guard < 8) {
    s = s.slice(1, -1)
    guard += 1
  }
  return s
}

function extractTextFromHastChildren(children: unknown): string {
  if (!Array.isArray(children)) {
    return ''
  }
  let result = ''
  for (const child of children) {
    if (typeof child !== 'object' || child === null || !('type' in child)) {
      continue
    }
    const c = child as { type: string; value?: unknown; children?: unknown }
    if (c.type === 'text' && typeof c.value === 'string') {
      result += c.value
    } else if (c.type === 'element' && c.children !== undefined) {
      result += extractTextFromHastChildren(c.children)
    }
  }
  return result
}

function classNameFromHast(node: ExtraProps['node']): string | undefined {
  const raw = node?.properties?.className
  if (Array.isArray(raw)) {
    const parts = raw.filter((x): x is string => typeof x === 'string')
    return parts.length > 0 ? parts.join(' ') : undefined
  }
  if (typeof raw === 'string') {
    return raw
  }
  return undefined
}

type MarkdownCodeProps = ComponentProps<'code'> & ExtraProps
type ChatStreamdownCodeProps = MarkdownCodeProps & {
  'data-block'?: boolean | string
}

export const ChatMarkdownCode = memo(function ChatMarkdownCode({
  node,
  className,
  children,
  'data-block': dataBlockAttr,
  ...rest
}: ChatStreamdownCodeProps) {
  const isBlock = dataBlockAttr === true || dataBlockAttr === 'true'
  const isStreaming = useChatMarkdownIsStreaming()
  const { resolvedTheme } = useTheme()

  if (!isBlock) {
    const inlineText = stripRedundantInlineCodeBackticks(nodeToPlainText(children))
    return (
      <code
        className={cn('rounded bg-muted px-1.5 py-0.5 font-mono text-sm', className)}
        data-streamdown="inline-code"
        {...rest}
      >
        {inlineText}
      </code>
    )
  }

  const fenceClassName = classNameFromHast(node) ?? className
  const { highlightLanguage, label } = extractFenceLanguage(fenceClassName)
  const codeText =
    node?.type === 'element' && node.tagName === 'code'
      ? extractTextFromHastChildren(node.children)
      : nodeToPlainText(children)

  const dir = getFencedBlockDirection(codeText)

  if (highlightLanguage === 'mermaid') {
    return (
      <ChatFencedCodeBlock
        code={codeText}
        languageLabel={label}
        dir={dir}
        contentClassName="!overflow-hidden !px-0 !pb-0"
      >
        <div className={cn('overflow-hidden rounded-md border border-border/60 bg-background')}>
          <ChatMermaidViewer chart={codeText} resolvedTheme={resolvedTheme} />
        </div>
      </ChatFencedCodeBlock>
    )
  }

  const fallback = <ShikiCodeFallback code={codeText} />

  return (
    <ChatFencedCodeBlock code={codeText} languageLabel={label} dir={dir}>
      <CodeHighlightErrorBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <SuspenseShikiCodeBlock
            language={highlightLanguage}
            code={codeText}
            isStreaming={isStreaming}
          />
        </Suspense>
      </CodeHighlightErrorBoundary>
    </ChatFencedCodeBlock>
  )
})
