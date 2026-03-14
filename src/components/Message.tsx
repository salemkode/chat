import { useSmoothText } from '@convex-dev/agent/react'
import type { FunctionReturnType } from 'convex/server'
import type { Id } from 'convex/_generated/dataModel'
import { api } from 'convex/_generated/api'
import { AlertCircle, ExternalLink, FileText, RefreshCw } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChatModel } from '@/components/chat-model-context'
import { useModels, useSendMessage } from '@/hooks/use-chat-data'
import { ModelSelectorPanel } from './model-selector'
import { MessageActivityTimeline } from './chat/MessageActivityTimeline'
import { CopyButton } from './CopyButton'
import { MarkdownContent } from './MarkdownContent'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover'

const LONG_PRESS_DELAY_MS = 450
const HOVER_CLOSE_DELAY_MS = 120

interface MessageProps {
  threadId: string
  message: FunctionReturnType<typeof api.chat.listMessages>['page'][number]
  promptMessageId?: string
}

export const Message = memo(function Message({
  threadId,
  message,
  promptMessageId,
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
  const fileParts = useMemo(() => getMessageFileParts(message.parts), [message.parts])
  const shouldShowResponsePlaceholder =
    !isFailedAssistant &&
    (message.status === 'streaming' || message.status === 'pending') &&
    !visibleText.trim()

  if (message.role === 'assistant') {
    const disableRepeat =
      message.status === 'streaming' || message.status === 'pending'

    return (
      <div className="mx-auto w-full max-w-3xl">
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
          <div className="shimmer-container px-1 py-2">
            <div className="space-y-3">
              <div className="shimmer-bg h-3.5 w-full rounded-full bg-muted" />
              <div className="shimmer-bg h-3.5 w-[90%] rounded-full bg-muted" />
              <div className="shimmer-bg h-3.5 w-[72%] rounded-full bg-muted" />
            </div>
          </div>
        ) : (
          <div dir="auto" className="px-1 py-1">
            <MarkdownContent content={visibleText} />
          </div>
        )}

        {fileParts.length > 0 ? (
          <div className="mt-3">
            <MessageAttachments files={fileParts} />
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-2 sm:mt-4 sm:gap-3 sm:pt-3">
          <CopyButton text={message.text} />
          <RepeatButton
            threadId={threadId}
            promptMessageId={promptMessageId}
            disabled={disableRepeat}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl justify-end">
      <div className="max-w-[85%] space-y-3 rounded-tl-xl rounded-tr-xl rounded-bl-xl bg-secondary px-3 py-2 text-secondary-foreground shadow-sm sm:max-w-[75%] sm:px-4 sm:py-2.5">
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

function MessageAttachments({ files }: { files: MessageFilePart[] }) {
  return (
    <div className="space-y-2">
      {files.map((file) =>
        file.mediaType.startsWith('image/') ? (
          <a
            key={`${file.url}:${file.filename || file.mediaType}`}
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-2xl border border-border/60 bg-background/70"
          >
            <img
              src={file.url}
              alt={file.filename || 'Attached image'}
              className="max-h-80 w-full object-cover"
            />
          </a>
        ) : (
          <a
            key={`${file.url}:${file.filename || file.mediaType}`}
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-3 py-3 text-sm transition-colors hover:bg-background"
          >
            <div className="inline-flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-foreground">
                {file.filename || 'Attached PDF'}
              </div>
              <div className="text-xs text-muted-foreground">
                {file.mediaType === 'application/pdf' ? 'PDF' : file.mediaType}
              </div>
            </div>
            <ExternalLink className="size-4 text-muted-foreground" />
          </a>
        ),
      )}
    </div>
  )
}

function RepeatButton({
  threadId,
  promptMessageId,
  disabled,
}: {
  threadId: string
  promptMessageId?: string
  disabled: boolean
}) {
  const { models } = useModels()
  const { regenerate, disabledReason } = useSendMessage()
  const { selectedModelId, setSelectedModelId } = useChatModel()
  const [open, setOpen] = useState(false)
  const [isRepeating, setIsRepeating] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTriggeredRef = useRef(false)

  const selectedModelDocId = useMemo(
    () =>
      models.find((model) => model.modelId === selectedModelId)?.id as
        | Id<'models'>
        | undefined,
    [models, selectedModelId],
  )
  const currentModel = useMemo(
    () => models.find((model) => model.modelId === selectedModelId),
    [models, selectedModelId],
  )
  const canRepeat = Boolean(
    promptMessageId && selectedModelDocId && !disabled && !isRepeating,
  )

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const scheduleClose = useCallback(() => {
    clearCloseTimer()
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      closeTimerRef.current = null
    }, HOVER_CLOSE_DELAY_MS)
  }, [clearCloseTimer])

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearCloseTimer()
      clearLongPressTimer()
    }
  }, [clearCloseTimer, clearLongPressTimer])

  const triggerRepeat = useCallback(
    async (modelId: string) => {
      const modelDocId = models.find((model) => model.modelId === modelId)?.id as
        | Id<'models'>
        | undefined
      if (!promptMessageId || !modelDocId || disabledReason !== null) {
        return
      }

      setSelectedModelId(modelId)
      setIsRepeating(true)

      try {
        await regenerate({
          threadId,
          promptMessageId,
          modelDocId,
        })
      } finally {
        setIsRepeating(false)
      }
    },
    [
      disabledReason,
      models,
      promptMessageId,
      regenerate,
      setSelectedModelId,
      threadId,
    ],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          type="button"
          disabled={!canRepeat || disabledReason !== null}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={
            currentModel
              ? `Repeat with ${currentModel.displayName}`
              : 'Repeat response'
          }
          title={
            currentModel ? `Repeat with ${currentModel.displayName}` : 'Repeat'
          }
          onClick={() => {
            if (longPressTriggeredRef.current || !selectedModelId) {
              longPressTriggeredRef.current = false
              return
            }

            void triggerRepeat(selectedModelId)
          }}
          onMouseEnter={() => {
            if (!canRepeat) {
              return
            }

            clearCloseTimer()
            setOpen(true)
          }}
          onMouseLeave={() => {
            if (!open) {
              return
            }

            scheduleClose()
          }}
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse' || !canRepeat) {
              return
            }

            clearLongPressTimer()
            longPressTriggeredRef.current = false
            longPressTimerRef.current = window.setTimeout(() => {
              longPressTriggeredRef.current = true
              setOpen(true)
              longPressTimerRef.current = null
            }, LONG_PRESS_DELAY_MS)
          }}
          onPointerUp={clearLongPressTimer}
          onPointerCancel={clearLongPressTimer}
          onPointerLeave={clearLongPressTimer}
        >
          <RefreshCw
            className={isRepeating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
          />
        </button>
      </PopoverAnchor>

      <PopoverContent
        className="w-[360px] overflow-hidden p-0"
        side="top"
        align="start"
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
      >
        <div className="border-b border-border px-3 py-2.5">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Repeat with
          </div>
          <div className="mt-1 text-sm text-foreground">
            {currentModel?.displayName || 'Select a model'}
          </div>
        </div>
        <ModelSelectorPanel
          selectedModel={selectedModelId}
          onSelectModel={(modelId) => {
            setOpen(false)
            void triggerRepeat(modelId)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function areMessagePropsEqual(prev: MessageProps, next: MessageProps): boolean {
  if (prev.threadId !== next.threadId) return false
  if (prev.promptMessageId !== next.promptMessageId) return false
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

type MessageFilePart = {
  url: string
  mediaType: string
  filename?: string
}

function getMessageFileParts(parts: Array<Record<string, unknown>>): MessageFilePart[] {
  const files: MessageFilePart[] = []

  for (const part of parts) {
    if (part.type !== 'file' || typeof part.url !== 'string') {
      continue
    }

    files.push({
      url: part.url,
      mediaType: typeof part.mediaType === 'string' ? part.mediaType : 'application/octet-stream',
      filename: typeof part.filename === 'string' ? part.filename : undefined,
    })
  }

  return files
}
