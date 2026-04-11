'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AlertCircle } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { useQuery } from '@/lib/convex-query-cache'
import {
  AttachmentGrid,
  ComposerActionRow,
  ProjectMentionPopup,
  SelectedProjectBadge,
  TextAttachmentGrid,
  type PendingAttachment,
} from './ai-prompt-input/parts'
import {
  combineTextAttachmentsWithPrompt,
  createTextAttachment,
  getAttachmentFingerprint,
  getComposerErrorMessage,
  getProjectMention,
  isSupportedAttachment,
  shouldConvertToTextAttachment,
  type ComposerReasoning,
  type ProjectMentionState,
  type TextAttachment,
} from './ai-prompt-input/utils'

function formatContextTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function ComposerContextMeter({
  threadId,
  modelDocId,
  mobile,
}: {
  threadId?: string
  modelDocId?: Id<'models'>
  mobile: boolean
}) {
  const data = useQuery(
    api.agents.getThreadContextMeter,
    threadId && modelDocId
      ? { threadId, selectedModelId: modelDocId }
      : 'skip',
  )

  if (!threadId || !modelDocId) {
    return null
  }
  if (data === undefined) {
    return null
  }
  if (data.contextWindow === null && !data.hasUsage) {
    return null
  }

  const limit = data.contextWindow
  const used = data.usedPromptTokens
  const pct =
    limit !== null && used !== null && limit > 0
      ? Math.min(100, Math.round((used / limit) * 100))
      : null

  const labelRight =
    used !== null && limit !== null
      ? `${formatContextTokens(used)} / ${formatContextTokens(limit)}`
      : limit !== null
        ? data.modelMatches
          ? '—'
          : 'Last turn used a different model'
        : '—'

  const size = mobile ? 34 : 32
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(100, pct ?? 0))
  const dashOffset = circumference - (progress / 100) * circumference
  const hasUsage = limit !== null && used !== null

  return (
    <div className="inline-flex shrink-0 items-center justify-center">
      <div
        className="group/context relative inline-flex items-center justify-center"
        title={labelRight}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/70"
            fill="transparent"
          />
          {hasUsage ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-primary transition-[stroke-dashoffset] duration-300"
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          ) : null}
        </svg>
        <span className="pointer-events-none absolute text-[11px] font-semibold tabular-nums text-foreground/85">
          {hasUsage ? progress : '—'}
        </span>
        <div className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 hidden whitespace-nowrap rounded-md border border-border/70 bg-background/95 px-2 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur group-hover/context:block">
          {labelRight}
        </div>
      </div>
    </div>
  )
}

interface AIPromptInputProps {
  onSubmit?: (
    value: string,
    opts: {
      searchEnabled: boolean
      projectId?: string
      attachments: File[]
      reasoning: ComposerReasoning
    },
  ) => Promise<void> | void
  disabled?: boolean
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  value?: string
  onValueChange?: (value: string) => void
  footerText?: string
  projects?: Array<{
    id: string
    name: string
    description?: string
  }>
  selectedProjectId?: string
  onProjectChange?: (projectId?: string) => void
  mobile?: boolean
  onEmptyEnter?: () => void
  reasoningSupported?: boolean
  reasoningLevels?: Array<'low' | 'medium' | 'high'>
  defaultReasoningLevel?: 'off' | 'low' | 'medium' | 'high'
  userReasoningEnabled?: boolean
  userReasoningLevel?: 'low' | 'medium' | 'high'
  contextThreadId?: string
  contextModelDocId?: Id<'models'>
}

export function AIPromptInput({
  onSubmit,
  disabled = false,
  selectedModel,
  onModelChange,
  value: controlledValue,
  onValueChange,
  footerText,
  projects = [],
  selectedProjectId,
  onProjectChange,
  mobile = false,
  onEmptyEnter,
  reasoningSupported = false,
  reasoningLevels,
  defaultReasoningLevel = 'off',
  userReasoningEnabled = false,
  userReasoningLevel = 'medium',
  contextThreadId,
  contextModelDocId,
}: AIPromptInputProps) {
  const [internalValue, setInternalValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchEnabled, setSearchEnabled] = useState(false)
  const [reasoningEnabled, setReasoningEnabled] = useState(userReasoningEnabled)
  const [reasoningLevel, setReasoningLevel] = useState<'low' | 'medium' | 'high'>(
    userReasoningLevel,
  )
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [projectMention, setProjectMention] = useState<ProjectMentionState | null>(
    null,
  )
  const [highlightedProjectIndex, setHighlightedProjectIndex] = useState(0)
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [textAttachments, setTextAttachments] = useState<TextAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const attachmentsRef = useRef<PendingAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const value = controlledValue ?? internalValue
  const selectedProject = projects.find((project) => project.id === selectedProjectId)
  const mentionProjects = projectMention
    ? (() => {
        const needle = projectMention.query.trim().toLowerCase()
        const matches = projects.filter((project) => {
          if (!needle) {
            return true
          }

          return `${project.name}\n${project.description ?? ''}`
            .toLowerCase()
            .includes(needle)
        })
        return matches.slice(0, 1)
      })()
    : []

  const setValue = (nextValue: string) => {
    setSubmitError(null)

    if (controlledValue !== undefined) {
      onValueChange?.(nextValue)
      return
    }

    setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }

  const syncProjectMention = (
    nextValue: string,
    caretPosition: number | null | undefined,
  ) => {
    const nextMention = getProjectMention(nextValue, caretPosition ?? nextValue.length)
    setProjectMention(nextMention)
    if (nextMention) {
      setHighlightedProjectIndex(0)
    }
  }

  const clearAttachments = () => {
    setAttachments((current) => {
      for (const attachment of current) {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl)
        }
      }

      return []
    })
    setTextAttachments([])
  }

  const removeTextAttachment = (id: string) => {
    setTextAttachments((current) => current.filter((att) => att.id !== id))
  }

  const addAttachments = (files: FileList | File[] | null) => {
    const incoming = Array.from(files ?? [])
    if (incoming.length === 0) {
      return
    }

    const unsupported = incoming.filter((file) => !isSupportedAttachment(file))
    if (unsupported.length > 0) {
      setSubmitError('Only images and PDFs are supported right now.')
    }

    const supported = incoming.filter(isSupportedAttachment)
    if (supported.length === 0) {
      return
    }

    setAttachments((current) => {
      const known = new Set(
        current.map((attachment) => getAttachmentFingerprint(attachment.file)),
      )
      const next = [...current]

      for (const file of supported) {
        const fingerprint = getAttachmentFingerprint(file)
        if (known.has(fingerprint)) {
          continue
        }

        known.add(fingerprint)
        next.push({
          id: fingerprint,
          file,
          previewUrl: file.type.startsWith('image/')
            ? URL.createObjectURL(file)
            : undefined,
        })
      }

      return next
    })
  }

  const removeAttachment = (attachmentId: string) => {
    setAttachments((current) => {
      const attachment = current.find((item) => item.id === attachmentId)
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl)
      }

      return current.filter((item) => item.id !== attachmentId)
    })
  }

  const handleProjectSelect = (projectId?: string) => {
    if (!projectId || !projectMention) {
      return
    }

    const textarea = textareaRef.current
    const before = value.slice(0, projectMention.start)
    const after = value.slice(projectMention.end)
    const nextValue = `${before}${after}`

    onProjectChange?.(projectId)
    setValue(nextValue)
    setProjectMention(null)

    requestAnimationFrame(() => {
      if (!textarea) {
        return
      }

      const cursor = before.length
      textarea.focus()
      textarea.setSelectionRange(cursor, cursor)
      syncProjectMention(nextValue, cursor)
    })
  }

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    const hasTextAttachments = textAttachments.length > 0
    if (
      (!value.trim() && attachments.length === 0 && !hasTextAttachments) ||
      !onSubmit ||
      disabled ||
      isSubmitting
    ) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const resolvedPrompt = combineTextAttachmentsWithPrompt(
        value,
        textAttachments,
      )
      await onSubmit(resolvedPrompt, {
        searchEnabled,
        projectId: selectedProjectId,
        attachments: attachments.map((attachment) => attachment.file),
        reasoning: reasoningSupported
          ? {
              enabled: reasoningEnabled,
              level: reasoningEnabled ? reasoningLevel : undefined,
            }
          : {
              enabled: false,
            },
      })
      setValue('')
      clearAttachments()
    } catch (error) {
      setSubmitError(getComposerErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = mobile ? '52px' : '48px'
    const scrollHeight = textarea.scrollHeight
    textarea.style.height = `${Math.min(scrollHeight, 200)}px`
  }, [mobile, value])

  useEffect(() => {
    if (!projectMention) {
      return
    }

    setHighlightedProjectIndex((current) =>
      mentionProjects.length === 0
        ? 0
        : Math.min(current, mentionProjects.length - 1),
    )
  }, [mentionProjects.length, projectMention])

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  useEffect(() => {
    setReasoningEnabled(userReasoningEnabled)
  }, [userReasoningEnabled])

  useEffect(() => {
    setReasoningLevel(userReasoningLevel)
  }, [userReasoningLevel])

  useEffect(() => {
    if (!submitError) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSubmitError(null)
    }, 3500)

    return () => window.clearTimeout(timeoutId)
  }, [submitError])

  useEffect(() => {
    return () => {
      for (const attachment of attachmentsRef.current) {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl)
        }
      }
    }
  }, [])

  return (
    <div
      className={cn(
        'pointer-events-auto mb-1 w-full',
        mobile ? 'bg-transparent' : '',
      )}
    >
      {submitError ? (
        <div className={cn('mb-2 flex justify-center', mobile && 'px-2')}>
          <div
            role="alert"
            aria-live="assertive"
            className="inline-flex max-w-[min(100%,42rem)] items-start gap-2 rounded-xl border border-destructive/45 bg-background/95 px-3 py-2 text-sm text-destructive shadow-lg backdrop-blur"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="leading-5">{submitError}</span>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false)
          }
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          addAttachments(event.dataTransfer.files)
        }}
        className={cn(
          'pointer-events-auto relative flex w-full min-w-0 flex-col items-stretch text-secondary-foreground',
          mobile
            ? 'rounded-4xl border border-border/90 bg-card p-3.5 shadow-[0_4px_24px_rgba(15,23,42,0.1)] dark:border-border/55 dark:bg-card/98 dark:shadow-[0_6px_28px_rgba(0,0,0,0.45)]'
            : 'rounded-4xl border border-border bg-linear-to-b from-background/95 to-background/90 bg-muted/80 p-3 backdrop-blur-2xl sm:max-w-3xl sm:p-4',
          isDragging && 'border-primary/60 bg-primary/5',
        )}
      >
        <div className={cn('flex min-w-0 grow flex-col items-start gap-2', mobile && 'gap-3')}>
          <SelectedProjectBadge
            selectedProject={selectedProject}
            mobile={mobile}
            onClear={() => onProjectChange?.(undefined)}
          />
          <TextAttachmentGrid
            textAttachments={textAttachments}
            mobile={mobile}
            onRemove={removeTextAttachment}
          />
          <AttachmentGrid
            attachments={attachments}
            mobile={mobile}
            onRemove={removeAttachment}
          />
          <textarea
            ref={textareaRef}
            name="input"
            placeholder="Type your message here..."
            value={value}
            onPaste={(event) => {
              const pastedText = event.clipboardData.getData('text/plain')
              if (pastedText && shouldConvertToTextAttachment(pastedText)) {
                event.preventDefault()
                setTextAttachments((current) => [
                  ...current,
                  createTextAttachment(pastedText),
                ])
              }
            }}
            onChange={(event) => {
              const nextValue = event.target.value
              setValue(nextValue)
              syncProjectMention(nextValue, event.target.selectionStart)
            }}
            onKeyDown={(event) => {
              if (projectMention) {
                if (event.key === 'ArrowDown' && mentionProjects.length > 0) {
                  event.preventDefault()
                  setHighlightedProjectIndex((current) =>
                    current + 1 >= mentionProjects.length ? 0 : current + 1,
                  )
                  return
                }
                if (event.key === 'ArrowUp' && mentionProjects.length > 0) {
                  event.preventDefault()
                  setHighlightedProjectIndex((current) =>
                    current - 1 < 0 ? mentionProjects.length - 1 : current - 1,
                  )
                  return
                }
                if (event.key === 'Enter' && mentionProjects.length > 0) {
                  event.preventDefault()
                  handleProjectSelect(mentionProjects[highlightedProjectIndex]?.id)
                  return
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setProjectMention(null)
                  return
                }
              }

              if (event.key === 'Enter' && event.shiftKey) {
                event.preventDefault()
                if (
                  !value.trim() &&
                  attachments.length === 0 &&
                  textAttachments.length === 0
                ) {
                  onEmptyEnter?.()
                  return
                }
                void handleSubmit()
              }
            }}
            onClick={(event) =>
              syncProjectMention(
                event.currentTarget.value,
                event.currentTarget.selectionStart,
              )
            }
            onKeyUp={(event) => {
              if (
                event.key === 'ArrowDown' ||
                event.key === 'ArrowUp' ||
                event.key === 'Enter' ||
                event.key === 'Escape'
              ) {
                return
              }

              syncProjectMention(
                event.currentTarget.value,
                event.currentTarget.selectionStart,
              )
            }}
            disabled={disabled}
            className={cn(
              'w-full min-w-0 resize-none bg-transparent text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-50',
              mobile && 'min-h-[52px] text-[17px] leading-[1.35] placeholder:text-muted-foreground/55 sm:text-base',
            )}
            aria-label="Message input"
            autoComplete="off"
            style={{ height: mobile ? '52px' : '48px' }}
          />
        </div>

        <ProjectMentionPopup
          projectMention={projectMention}
          mentionProjects={mentionProjects}
          highlightedProjectIndex={highlightedProjectIndex}
          mobile={mobile}
          onSelect={handleProjectSelect}
        />

        <ComposerActionRow
          disabled={disabled}
          isSubmitting={isSubmitting}
          value={value}
          attachments={attachments}
          textAttachments={textAttachments}
          mobile={mobile}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          searchEnabled={searchEnabled}
          onToggleSearch={() => setSearchEnabled((current) => !current)}
          reasoningSupported={reasoningSupported}
          reasoningEnabled={reasoningEnabled}
          onToggleReasoning={setReasoningEnabled}
          reasoningLevel={reasoningLevel}
          onReasoningLevel={setReasoningLevel}
          reasoningLevels={reasoningLevels}
          defaultReasoningLevel={defaultReasoningLevel}
          onAttach={addAttachments}
          contextMeter={
            <ComposerContextMeter
              threadId={contextThreadId}
              modelDocId={contextModelDocId}
              mobile={mobile}
            />
          }
        />
      </form>

      {footerText ? (
        <p className="mt-2 px-1 text-xs text-muted-foreground">{footerText}</p>
      ) : null}
    </div>
  )
}
