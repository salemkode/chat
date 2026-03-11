import { useSmoothText } from '@convex-dev/agent/react'
import { CopyButton } from './CopyButton'
import { MarkdownContent } from './MarkdownContent'
import { ThinkingProcess } from './ThinkingProcess'
import { RefreshCw } from 'lucide-react'
import { memo, useMemo } from 'react'
import type { OfflineMessageRecord } from '@/offline/schema'

interface MessageProps {
  message: OfflineMessageRecord
  modelName?: string
}

export const Message = memo(function Message({ message, modelName }: MessageProps) {
  const shouldSmoothText =
    message.role === 'assistant' && message.status === 'streaming'
  const [smoothedText] = useSmoothText(message.text, {
    startStreaming: shouldSmoothText,
  })
  const visibleText = shouldSmoothText ? smoothedText : message.text

  const thinking = useMemo(
    () => message.parts.find((part) => part.type === 'reasoning'),
    [message.parts],
  )

  if (message.role === 'assistant') {
    return (
      <div className="w-full max-w-3xl mx-auto">
        {/* Thinking Section */}
        {thinking && (
          <ThinkingProcess
            text={thinking.text}
            isStreaming={message.status === 'streaming'}
          />
        )}

        <div dir="auto">
          <MarkdownContent content={visibleText} />
        </div>

        {/* Bottom bar with model name and actions */}
        <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border/50">
          <CopyButton text={message.text} />
          <button
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            title="Regenerate"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {modelName && (
            <span className="ml-auto text-xs text-muted-foreground">
              {modelName}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end w-full max-w-3xl mx-auto">
      <div className="rounded-tr-xl rounded-tl-xl rounded-bl-xl bg-secondary text-secondary-foreground px-3 sm:px-4 py-2 sm:py-2.5 max-w-[85%] sm:max-w-[75%] shadow-sm">
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {visibleText}
        </p>
      </div>
    </div>
  )
}, areMessagePropsEqual)

function areMessagePropsEqual(prev: MessageProps, next: MessageProps): boolean {
  if (prev.modelName !== next.modelName) return false
  if (prev.message === next.message) return true

  const previousMessage = prev.message
  const nextMessage = next.message

  if (
    previousMessage.id !== nextMessage.id ||
    previousMessage.role !== nextMessage.role ||
    previousMessage.status !== nextMessage.status ||
    previousMessage.text !== nextMessage.text
  ) {
    return false
  }

  if (previousMessage.parts.length !== nextMessage.parts.length) {
    return false
  }

  for (let index = 0; index < previousMessage.parts.length; index += 1) {
    const prevPart = previousMessage.parts[index]
    const nextPart = nextMessage.parts[index]
    if (!prevPart || !nextPart || prevPart.type !== nextPart.type) {
      return false
    }
    const prevText =
      typeof prevPart === 'object' && 'text' in prevPart ? prevPart.text : undefined
    const nextText =
      typeof nextPart === 'object' && 'text' in nextPart ? nextPart.text : undefined
    if (prevText !== nextText) {
      return false
    }
  }

  return true
}
