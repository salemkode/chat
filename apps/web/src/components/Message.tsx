import { useSmoothText } from '@convex-dev/agent/react'
import { getQuranAyahCardFromParts } from '@chat/shared/quran-ayah'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
import { AlertCircle, FileText, ChevronDown, ChevronUp } from '@/lib/icons'
import { memo, useMemo, useState } from 'react'
import { useIsMobile } from '@chat/shared/hooks/use-mobile'
import { getMessageFailurePresentation } from '@/lib/chat-generation'
import { cn } from '@/lib/utils'
import { QuranAyahCard } from './chat/QuranAyahCard'
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
  const ayahCard = useMemo(
    () => getQuranAyahCardFromParts(message.parts),
    [message.parts],
  )
  const shouldShowResponsePlaceholder =
    !isFailedAssistant &&
    (message.status === 'streaming' || message.status === 'pending') &&
    !ayahCard &&
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
            className={cn(
              'space-y-3 px-1 py-1',
              isMobile && 'space-y-3.5 px-0.5 py-1.5',
            )}
          >
            {ayahCard ? <QuranAyahCard ayah={ayahCard} /> : null}
            {visibleText.trim() ? (
              <ChatMarkdown
                text={visibleText}
                isStreaming={
                  message.status === 'streaming' || message.status === 'pending'
                }
              />
            ) : null}
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

        {!message.localOnly ? (
          <div
            className={cn(
              'mt-3 flex items-center gap-2 border-t border-border/50 pt-2 sm:mt-4 sm:gap-3 sm:pt-3',
              isMobile && 'mt-4 gap-3 border-border/35 pt-3',
            )}
          >
            <CopyButton text={message.text} />
            {isActiveGeneration ? (
              <StopButton
                threadId={threadId}
                promptMessageId={promptMessageId}
              />
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
        ) : null}
      </div>
    )
  }

  const isLongUserMessage = visibleText.length >= 500 || visibleText.split('\n').length >= 10

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-end">
      <div
        className={cn(
          'max-w-[85%] space-y-3 rounded-tl-xl rounded-tr-xl rounded-bl-xl bg-secondary px-3 py-2 text-secondary-foreground sm:max-w-[75%] sm:px-4 sm:py-2.5',
          isMobile && 'max-w-[90%] rounded-[1.35rem] bg-secondary/92 px-3.5 py-3',
        )}
      >
        {fileParts.length > 0 ? <MessageAttachments files={fileParts} /> : null}
        {visibleText.trim() ? (
          isLongUserMessage ? (
            <CollapsibleUserText text={visibleText} />
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {visibleText}
            </p>
          )
        ) : null}
      </div>
      {visibleText.trim() ? (
        <div className="mt-2 flex items-center justify-end">
          <CopyButton text={message.text} />
        </div>
      ) : null}
    </div>
  )
}, areMessagePropsEqual)

const COLLAPSED_LINE_LIMIT = 4

function CollapsibleUserText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const lines = text.split('\n')
  const lineCount = lines.length
  const charCount = text.length
  const preview = lines.slice(0, COLLAPSED_LINE_LIMIT).join('\n')

  if (!expanded) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-left transition-colors hover:bg-background/60"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-foreground/80">
              Pasted text
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {charCount.toLocaleString()} chars · {lineCount}{' '}
              {lineCount === 1 ? 'line' : 'lines'}
            </div>
          </div>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
        <pre className="line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-secondary-foreground/70">
          {preview}
          {lines.length > COLLAPSED_LINE_LIMIT ? '…' : ''}
        </pre>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-left transition-colors hover:bg-background/60"
      >
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-foreground/80">
            Pasted text
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {charCount.toLocaleString()} chars · {lineCount}{' '}
            {lineCount === 1 ? 'line' : 'lines'}
          </div>
        </div>
        <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" />
      </button>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {text}
      </p>
    </div>
  )
}
