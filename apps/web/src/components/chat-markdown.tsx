import { code } from '@streamdown/code'
import { memo, useMemo } from 'react'
import { type Components, Streamdown } from 'streamdown'
import { ChatMarkdownCode } from '@/components/chat-markdown-code'
import { ChatMarkdownRenderContext } from '@/components/chat-markdown-render-context'
import { useStreamingMarkdownWeb } from '@/lib/streaming-markdown-web'
import { cn } from '@/lib/utils'

export interface ChatMarkdownProps {
  text: string
  isStreaming?: boolean
  className?: string
}

const CommittedMarkdownBlock = memo(function CommittedMarkdownBlock({
  markdown,
  components,
}: {
  markdown: string
  components: Components
}) {
  return (
    <Streamdown
      mode="static"
      isAnimating={false}
      components={components}
      plugins={{ code }}
      lineNumbers={false}
      className="streamdown"
    >
      {markdown}
    </Streamdown>
  )
})

export const ChatMarkdown = memo(function ChatMarkdown({
  text,
  isStreaming = false,
  className,
}: ChatMarkdownProps) {
  const segments = useStreamingMarkdownWeb(text, isStreaming)

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
          >
            {children}
          </a>
        )
      },
      code: ChatMarkdownCode,
    }),
    [],
  )

  return (
    <ChatMarkdownRenderContext.Provider value={{ isStreaming }}>
      <div
        className={cn(
          'chat-markdown w-full min-w-0 max-w-none overflow-hidden text-foreground/90 wrap-anywhere',
          'prose prose-sm dark:prose-invert',
          className,
        )}
      >
        {segments.committedBlocks.map((block, index) => (
          <CommittedMarkdownBlock
            key={index}
            markdown={block}
            components={markdownComponents}
          />
        ))}
        {segments.hasUnstableTail ? (
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[0.95em] leading-relaxed text-foreground/85">
            {segments.streamTail}
          </pre>
        ) : null}
      </div>
    </ChatMarkdownRenderContext.Provider>
  )
})
