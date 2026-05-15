import type { Id } from '@convex/_generated/dataModel'
import { isAutoModelSelection } from '@chat/shared'
import { ExternalLink, FileText, RefreshCw, RotateCcw, Square } from '@/lib/icons'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChatModel } from '@/components/chat-model-context'
import { useI18n } from '@/components/i18n-provider'
import { useModels, useSendMessage, useViewer } from '@/hooks/use-chat-data'
import { cn } from '@/lib/utils'
import { ModelSelectorPanel } from '@/components/model-selector'
import { Button } from '@/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import type { MessageFilePart } from '@/components/message/utils'
import { getSelectionTierFromAppPlan } from '@/lib/model-routing'

const LONG_PRESS_DELAY_MS = 450
const HOVER_CLOSE_DELAY_MS = 120

export function MessageAttachments({ files }: { files: MessageFilePart[] }) {
  const { t } = useI18n()

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
              alt={file.filename || t('message.attachedImage')}
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
                {file.filename || t('message.attachedPdf')}
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

export function RepeatButton({
  threadId,
  promptMessageId,
  disabled,
}: {
  threadId: string
  promptMessageId?: string
  disabled: boolean
}) {
  const { t } = useI18n()
  const { models } = useModels()
  const { regenerate, disabledReason } = useSendMessage()
  const viewer = useViewer()
  const { selectedModelId, setSelectedModelId } = useChatModel()
  const [open, setOpen] = useState(false)
  const [isRepeating, setIsRepeating] = useState(false)
  const closeTimerRef = useRef<number | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const longPressTriggeredRef = useRef(false)

  const selectedModelDocId = useMemo(
    () => models.find((model) => model.modelId === selectedModelId)?.id as Id<'models'> | undefined,
    [models, selectedModelId],
  )
  const currentModel = useMemo(
    () => models.find((model) => model.modelId === selectedModelId),
    [models, selectedModelId],
  )
  const selectionTier = getSelectionTierFromAppPlan(viewer?.appPlan)
  const canRepeat = Boolean(
    promptMessageId &&
    !disabled &&
    !isRepeating &&
    (selectedModelDocId || isAutoModelSelection(selectedModelId)),
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
      if (!promptMessageId || disabledReason !== null) {
        return
      }
      if (!modelDocId && !isAutoModelSelection(modelId)) {
        return
      }

      setSelectedModelId(modelId)
      setIsRepeating(true)

      try {
        await regenerate({
          threadId,
          promptMessageId,
          modelDocId,
          selectionTier,
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
      selectionTier,
      setSelectedModelId,
      threadId,
    ],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!canRepeat || disabledReason !== null}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={
            selectedModelId && isAutoModelSelection(selectedModelId)
              ? t('message.repeatWithAuto')
              : currentModel
                ? t('message.repeatWithModel', { modelName: currentModel.displayName })
                : t('message.repeatResponse')
          }
          title={
            selectedModelId && isAutoModelSelection(selectedModelId)
              ? t('message.repeatWithAuto')
              : currentModel
                ? t('message.repeatWithModel', { modelName: currentModel.displayName })
                : t('message.repeatShort')
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
          <RefreshCw className={isRepeating ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        </Button>
      </PopoverAnchor>

      <PopoverContent
        className="w-[min(100vw-1rem,20rem)] overflow-hidden p-0"
        side="top"
        align="start"
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
      >
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-sm font-medium">{t('message.repeatWithModelTitle')}</p>
          <p className="text-xs text-muted-foreground">
            {t('message.currentModel', {
              modelName:
                selectedModelId && isAutoModelSelection(selectedModelId)
                  ? t('message.auto')
                  : (currentModel?.displayName ?? t('message.none')),
            })}
          </p>
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

export function StopButton({
  threadId,
  promptMessageId,
}: {
  threadId: string
  promptMessageId?: string
}) {
  const { t } = useI18n()
  const { stop, disabledReason } = useSendMessage()
  const [isStopping, setIsStopping] = useState(false)

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={!promptMessageId || disabledReason !== null || isStopping}
      className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={t('message.stopGeneration')}
      title={t('message.stopGeneration')}
      onClick={async () => {
        if (!promptMessageId || isStopping) {
          return
        }

        setIsStopping(true)
        try {
          await stop({ threadId, promptMessageId })
        } finally {
          setIsStopping(false)
        }
      }}
    >
      <Square className={cn('h-4 w-4', isStopping && 'animate-pulse')} />
    </Button>
  )
}

export function ResendButton({
  threadId,
  promptMessageId,
  forceStopFirst,
}: {
  threadId: string
  promptMessageId?: string
  forceStopFirst: boolean
}) {
  const { models } = useModels()
  const { regenerate, stop, disabledReason } = useSendMessage()
  const viewer = useViewer()
  const { selectedModelId } = useChatModel()
  const [isResending, setIsResending] = useState(false)

  const selectedModelDocId = useMemo(
    () => models.find((model) => model.modelId === selectedModelId)?.id as Id<'models'> | undefined,
    [models, selectedModelId],
  )
  const selectionTier = getSelectionTierFromAppPlan(viewer?.appPlan)
  const canResend = Boolean(
    promptMessageId && (selectedModelDocId || isAutoModelSelection(selectedModelId)),
  )

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={!canResend || disabledReason !== null || isResending}
      className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Resend response"
      title="Resend response"
      onClick={async () => {
        if (
          !promptMessageId ||
          (!selectedModelDocId && !isAutoModelSelection(selectedModelId)) ||
          isResending
        ) {
          return
        }

        setIsResending(true)
        try {
          if (forceStopFirst) {
            await stop({ threadId, promptMessageId })
          }
          await regenerate({
            threadId,
            promptMessageId,
            modelDocId: selectedModelDocId,
            selectionTier,
          })
        } finally {
          setIsResending(false)
        }
      }}
    >
      <RotateCcw className={cn('h-4 w-4', isResending && 'animate-spin')} />
    </Button>
  )
}
