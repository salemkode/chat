import { useSmoothText } from '@convex-dev/agent/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from 'convex/_generated/api'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { memo, useMemo } from 'react'
import { MessageActivityTimeline } from './chat/MessageActivityTimeline'
import { CopyButton } from './CopyButton'
import { MarkdownContent } from './MarkdownContent'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

interface MessageProps {
  message: FunctionReturnType<typeof api.chat.listMessages>['page'][number]
  modelName?: string
}

export const Message = memo(function Message({
  message,
  modelName,
}: MessageProps) {
  const shouldSmoothText =
    message.role === 'assistant' && message.status === 'streaming'
  const [smoothedText] = useSmoothText(message.text, {
    startStreaming: shouldSmoothText,
  })
  const visibleText = shouldSmoothText ? smoothedText : message.text
  const isFailedAssistant =
    message.role === 'assistant' && message.status === 'failed'
  const hasActivity = useMemo(
    () =>
      message.parts.some((part: Record<string, unknown>) => {
        const type = String(part.type)
        return (
          type === 'reasoning' ||
          type === 'redacted-reasoning' ||
          type === 'tool-call' ||
          type === 'tool-result' ||
          (type.startsWith('tool-') && type !== 'tool-calls')
        )
      }),
    [message.parts],
  )
  const shouldShowResponsePlaceholder =
    !isFailedAssistant &&
    (message.status === 'streaming' || message.status === 'pending') &&
    !visibleText.trim()

  if (message.role === 'assistant') {
    return (
      <div className="w-full max-w-3xl mx-auto">
        {hasActivity ? (
          <MessageActivityTimeline
            parts={message.parts}
            messageStatus={message.status}
          />
        ) : null}

        {isFailedAssistant ? (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Message failed</AlertTitle>
            <AlertDescription>
              <p className="whitespace-pre-wrap break-words">
                {visibleText || 'The model could not complete this response.'}
              </p>
            </AlertDescription>
          </Alert>
        ) : shouldShowResponsePlaceholder ? (
          <div className="rounded-[1.75rem] border border-border/70 bg-card/85 p-5 shadow-sm shimmer-container">
            <div className="space-y-3">
              <div className="shimmer-bg bg-muted h-3.5 w-full rounded-full" />
              <div className="shimmer-bg bg-muted h-3.5 w-[90%] rounded-full" />
              <div className="shimmer-bg bg-muted h-3.5 w-[72%] rounded-full" />
            </div>
          </div>
        ) : (
          <div
            dir="auto"
            className="rounded-[1.75rem] border border-border/70 bg-card/85 px-5 py-4 shadow-sm"
          >
            <MarkdownContent content={visibleText} />
          </div>
        )}

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
    if (
      !prevPart ||
      !nextPart ||
      JSON.stringify(prevPart) !== JSON.stringify(nextPart)
    ) {
      return false
    }
  }

  return true
}
