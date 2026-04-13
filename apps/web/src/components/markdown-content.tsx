import { memo } from 'react'
import { ChatMarkdown } from '@/components/chat-markdown'

interface MarkdownContentProps {
  className?: string
  content: string
}

/** Static / non-streaming markdown — same pipeline as chat (`remark-gfm` + Shiki fences). */
export const MarkdownContent = memo(function MarkdownContent({
  content,
  className,
}: MarkdownContentProps) {
  return <ChatMarkdown text={content} isStreaming={false} className={className} />
})
