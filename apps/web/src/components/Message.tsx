import { useSmoothText } from '@convex-dev/agent/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
import { AlertCircle } from 'lucide-react'
import { memo, useMemo } from 'react'
import { useIsMobile } from '@chat/shared/hooks/use-mobile'
import { getMessageFailurePresentation } from '@/lib/chat-generation'
import { cn } from '@/lib/utils'
import { MessageActivityTimeline } from './chat/MessageActivityTimeline'
import { ChatMarkdown } from './ChatMarkdown'
import { CopyButton } from './CopyButton'
import {
  MessageAttachments,
  RepeatButton,
  ResendButton,
  StopButton,
} from './message/actions'
import { areMessagePropsEqual, getMessageFileParts } from './message/utils'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'

interface MessageProps {
  threadId: string
  message: FunctionReturnType<typeof api.chat.listMessages>['page'][number]
  promptMessageId?: string
  isActiveGeneration?: boolean
  isStalled?: boolean
}

export const Message = memo(function Message({
  threadId,
  message,
  promptMessageId,
  isActiveGeneration = false,
  isStalled = false,
}: MessageProps) {
  const isMobile = useIsMobile()
  const shouldSmoothText =
    message.role === 'assistant' && message.status === 'streaming'
  const [smoothedText] = useSmoothText(message.text, {
    startStreaming: shouldSmoothText,
  })
  const visibleText = shouldSmoothText ? smoothedText : message.text
  const isFailedAssistant =
    message.role === 'assistant' && message.status === 'failed'
  const failurePresentation = getMessageFailurePresentation(message)
  const shouldReplaceWithFailureMessage =
    isFailedAssistant && failurePresentation?.mode === 'replace'
  const shouldShowFailureClarification =
    isFailedAssistant && failurePresentation?.mode === 'clarify'
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
  const fileParts = useMemo(
    () => getMessageFileParts(message.parts),
    [message.parts],
  )
  const shouldShowResponsePlaceholder =
    !isFailedAssistant &&
    (message.status === 'streaming' || message.status === 'pending') &&
    !visibleText.trim()

  if (message.role === 'assistant') {
    const disableRepeat =
      message.status === 'streaming' || message.status === 'pending'
    const failureTitle =
      failurePresentation?.kind === 'stopped'
        ? 'Generation stopped'
        : 'Message failed'
    const failureNote =
      failurePresentation?.note || 'The model could not complete this response.'
    const failureVariant =
      failurePresentation?.kind === 'error' ? 'destructive' : 'default'
    const shouldShowResend = isFailedAssistant || isStalled

    return (
      <div className={cn('mx-auto w-full max-w-3xl', isMobile && 'px-0.5')}>
        {hasActivity ? (
          <MessageActivityTimeline
            parts={message.parts}
            messageStatus={message.status}
          />
        ) : null}

        {shouldReplaceWithFailureMessage ? (
          <Alert
            variant={failureVariant}
            className={
              failureVariant === 'destructive' ? 'border-destructive/40' : ''
            }
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{failureTitle}</AlertTitle>
            <AlertDescription>
              <p className="whitespace-pre-wrap break-words">{failureNote}</p>
            </AlertDescription>
          </Alert>
        ) : shouldShowResponsePlaceholder ? (
          <div className="shimmer-container px-1 py-2">
            <div className="space-y-3">
              <div className="shimmer-bg h-3.5 w-full rounded-full bg-muted" />
              <div className="shimmer-bg h-3.5 w-[90%] rounded-full bg-muted" />
              <div className="shimmer-bg h-3.5 w-[72%] rounded-full bg-muted" />
            </div>
          </div>
        ) : (
          <div
            dir="auto"
            className={cn('px-1 py-1', isMobile && 'px-0.5 py-1.5')}
          >
            <ChatMarkdown
              text={visibleText}
              isStreaming={
                message.status === 'streaming' || message.status === 'pending'
              }
            />
          </div>
        )}
        {shouldShowFailureClarification ? (
          <Alert
            variant={failureVariant}
            className={cn(
              'mt-3',
              failureVariant === 'destructive' && 'border-destructive/40',
            )}
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{failureTitle}</AlertTitle>
            <AlertDescription>
              <p className="whitespace-pre-wrap break-words">{failureNote}</p>
            </AlertDescription>
          </Alert>
        ) : null}

        {fileParts.length > 0 ? (
          <div className="mt-3">
            <MessageAttachments files={fileParts} />
          </div>
        ) : null}

        <div
          className={cn(
            'mt-3 flex items-center gap-2 border-t border-border/50 pt-2 sm:mt-4 sm:gap-3 sm:pt-3',
            isMobile && 'mt-4 gap-3 border-border/35 pt-3',
          )}
        >
          <CopyButton text={message.text} />
          {isActiveGeneration ? (
            <StopButton threadId={threadId} promptMessageId={promptMessageId} />
          ) : null}
          {shouldShowResend ? (
            <ResendButton
              threadId={threadId}
              promptMessageId={promptMessageId}
              forceStopFirst={isStalled}
            />
          ) : null}
          {!shouldShowResend ? (
            <RepeatButton
              threadId={threadId}
              promptMessageId={promptMessageId}
              disabled={disableRepeat}
            />
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl justify-end">
      <div
        className={cn(
          'max-w-[85%] space-y-3 rounded-tl-xl rounded-tr-xl rounded-bl-xl bg-secondary px-3 py-2 text-secondary-foreground shadow-sm sm:max-w-[75%] sm:px-4 sm:py-2.5',
          isMobile &&
            'max-w-[90%] rounded-[1.35rem] bg-secondary/92 px-3.5 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]',
        )}
      >
        {fileParts.length > 0 ? <MessageAttachments files={fileParts} /> : null}
        {visibleText.trim() ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {visibleText}
          </p>
        ) : null}
      </div>
    </div>
  )
}, areMessagePropsEqual)
