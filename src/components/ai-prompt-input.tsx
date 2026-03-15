'use client'

import { useState, useRef, useEffect } from 'react'
import {
  AlertCircle,
  ArrowUp,
  FileText,
  Folder,
  Globe,
  Paperclip,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModelSelector } from './model-selector'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'

interface AIPromptInputProps {
  onSubmit?: (
    value: string,
    opts: { searchEnabled: boolean; projectId?: string; attachments: File[] },
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
}

type ProjectMentionState = {
  start: number
  end: number
  query: string
}

type PendingAttachment = {
  id: string
  file: File
  previewUrl?: string
}

const CHAT_ATTACHMENT_ACCEPT = 'image/*,application/pdf'

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
}: AIPromptInputProps) {
  const [internalValue, setInternalValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchEnabled, setSearchEnabled] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [projectMention, setProjectMention] =
    useState<ProjectMentionState | null>(null)
  const [highlightedProjectIndex, setHighlightedProjectIndex] = useState(0)
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const attachmentsRef = useRef<PendingAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const value = controlledValue ?? internalValue
  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )
  const mentionProjects = projectMention
    ? projects.filter((project) => {
        const needle = projectMention.query.trim().toLowerCase()
        if (!needle) {
          return true
        }

        return `${project.name}\n${project.description ?? ''}`
          .toLowerCase()
          .includes(needle)
      })
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

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = mobile ? '52px' : '48px'
      const scrollHeight = textarea.scrollHeight
      textarea.style.height = `${Math.min(scrollHeight, 200)}px`
    }
  }, [mobile, value])

  useEffect(() => {
    if (!projectMention) {
      return
    }

    setHighlightedProjectIndex((current) => {
      if (mentionProjects.length === 0) {
        return 0
      }

      return Math.min(current, mentionProjects.length - 1)
    })
  }, [mentionProjects.length, projectMention])

  useEffect(() => {
    attachmentsRef.current = attachments
  }, [attachments])

  useEffect(() => {
    return () => {
      for (const attachment of attachmentsRef.current) {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl)
        }
      }
    }
  }, [])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if ((!value.trim() && attachments.length === 0) || !onSubmit || disabled || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await onSubmit(value, {
        searchEnabled,
        projectId: selectedProjectId,
        attachments: attachments.map((attachment) => attachment.file),
      })
      setValue('')
      clearAttachments()
    } catch (error) {
      setSubmitError(getComposerErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (projectMention) {
      if (e.key === 'ArrowDown' && mentionProjects.length > 0) {
        e.preventDefault()
        setHighlightedProjectIndex((current) =>
          current + 1 >= mentionProjects.length ? 0 : current + 1,
        )
        return
      }

      if (e.key === 'ArrowUp' && mentionProjects.length > 0) {
        e.preventDefault()
        setHighlightedProjectIndex((current) =>
          current - 1 < 0 ? mentionProjects.length - 1 : current - 1,
        )
        return
      }

      if (e.key === 'Enter' && mentionProjects.length > 0) {
        e.preventDefault()
        handleProjectSelect(mentionProjects[highlightedProjectIndex]?.id)
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        setProjectMention(null)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const syncProjectMention = (
    nextValue: string,
    caretPosition: number | null | undefined,
  ) => {
    const nextMention = getProjectMention(
      nextValue,
      caretPosition ?? nextValue.length,
    )
    setProjectMention(nextMention)
    if (nextMention) {
      setHighlightedProjectIndex(0)
    }
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

  const addAttachments = (files: FileList | File[]) => {
    const incoming = Array.from(files)
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

  const clearAttachments = () => {
    setAttachments((current) => {
      for (const attachment of current) {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl)
        }
      }

      return []
    })
  }

  return (
    <div className="pointer-events-auto w-full">
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
            ? 'rounded-[1.6rem] border border-border/70 bg-background/88 p-3 shadow-[0_-12px_40px_rgba(15,23,42,0.10)] backdrop-blur-2xl'
            : 'rounded-t-xl border border-border bg-linear-to-b from-background/95 to-background/90 bg-muted/80 p-3 backdrop-blur-2xl sm:max-w-3xl sm:p-4',
          isDragging && 'border-primary/60 bg-primary/5',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 grow flex-col items-start gap-2',
            mobile && 'gap-3',
          )}
        >
          {selectedProject ? (
            <Badge
              variant="secondary"
              className={cn(
                'max-w-full gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-foreground',
                mobile && 'bg-muted/55 px-3 py-1.5',
              )}
            >
              <Folder className="size-3" />
              <span className="max-w-52 truncate">{selectedProject.name}</span>
              <button
                type="button"
                onClick={() => onProjectChange?.(undefined)}
                className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Clear selected project"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ) : null}
          {attachments.length > 0 ? (
            <div
              className={cn(
                'grid w-full grid-cols-1 gap-2 sm:grid-cols-2',
                mobile && 'sm:grid-cols-1',
              )}
            >
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className={cn(
                    'flex min-w-0 items-center gap-3 rounded-2xl border border-border/70 bg-background/75 p-2.5',
                    mobile && 'rounded-[1.15rem] bg-muted/30 px-3 py-2.5',
                  )}
                >
                  {attachment.previewUrl ? (
                    <img
                      src={attachment.previewUrl}
                      alt={attachment.file.name}
                      className="size-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="inline-flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <FileText className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {attachment.file.name}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatAttachmentMeta(attachment.file)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${attachment.file.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            name="input"
            placeholder="Type your message here... Use @ to tag a project, or drop an image/PDF"
            value={value}
            onChange={(e) => {
              const nextValue = e.target.value
              setValue(nextValue)
              syncProjectMention(nextValue, e.target.selectionStart)
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) =>
              syncProjectMention(
                e.currentTarget.value,
                e.currentTarget.selectionStart,
              )
            }
            onKeyUp={(e) => {
              if (
                e.key === 'ArrowDown' ||
                e.key === 'ArrowUp' ||
                e.key === 'Enter' ||
                e.key === 'Escape'
              ) {
                return
              }

              syncProjectMention(
                e.currentTarget.value,
                e.currentTarget.selectionStart,
              )
            }}
            disabled={disabled}
            className={cn(
              'w-full min-w-0 resize-none bg-transparent text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-50',
              mobile && 'min-h-[52px] text-[15px] leading-6',
            )}
            aria-label="Message input"
            autoComplete="off"
            style={{ height: mobile ? '52px' : '48px' }}
          />
        </div>

        {projectMention ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur">
            <div className="border-b border-border/60 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Projects
            </div>
            <div className="max-h-56 overflow-y-auto p-2">
              {mentionProjects.length > 0 ? (
                mentionProjects.map((project, index) => {
                  const isHighlighted = index === highlightedProjectIndex

                  return (
                    <button
                      type="button"
                      key={project.id}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                        isHighlighted
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleProjectSelect(project.id)}
                    >
                      <div
                        className={cn(
                          'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border',
                          isHighlighted
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-border/70 bg-background text-muted-foreground',
                        )}
                      >
                        <Folder className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {project.name}
                        </div>
                        {project.description ? (
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {project.description}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="px-3 py-5 text-sm text-muted-foreground">
                  No matching projects.
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            'flex w-full min-w-0 items-center justify-between',
            mobile ? 'mt-1 flex-col-reverse gap-3' : 'flex-row-reverse',
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-center justify-center',
              mobile && 'w-full justify-end',
            )}
          >
            <button
              type="submit"
              disabled={
                disabled || isSubmitting || (!value.trim() && attachments.length === 0)
              }
              aria-label={
                isSubmitting
                  ? 'Sending message'
                  : value.trim() || attachments.length > 0
                    ? 'Send message'
                    : 'Message requires text or a supported file'
              }
              className={cn(
                'inline-flex items-center justify-center bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary disabled:active:bg-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
                mobile ? 'size-11 rounded-full p-0 shadow-sm' : 'size-9 rounded-lg p-2',
              )}
            >
              <ArrowUp className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div
            className={cn(
              'flex min-w-0 items-center gap-2',
              mobile && 'w-full flex-wrap items-stretch',
            )}
          >
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              className={cn(
                mobile &&
                  'h-11 min-w-0 flex-1 justify-between rounded-full border border-border/70 bg-muted/40 px-3.5 text-sm',
              )}
            />

            <button
              type="button"
              onClick={() => setSearchEnabled(!searchEnabled)}
              aria-label={searchEnabled ? 'Disable search' : 'Enable search'}
              className={cn(
                'inline-flex items-center justify-center text-xs font-medium transition-colors hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
                mobile
                  ? 'h-11 rounded-full border border-border/70 px-3.5'
                  : 'h-8 rounded-lg px-2.5',
                searchEnabled
                  ? 'text-foreground bg-muted/60'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Globe className="size-4" />
            </button>

            <label
              className={cn(
                'inline-flex cursor-pointer items-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
                mobile
                  ? 'h-11 rounded-full border border-border/70 px-3.5'
                  : 'h-8 rounded-lg px-2.5',
              )}
              aria-label="Attach a file"
            >
              <input
                ref={fileInputRef}
                multiple
                accept={CHAT_ATTACHMENT_ACCEPT}
                className="sr-only"
                type="file"
                onChange={(event) => {
                  addAttachments(event.target.files || [])
                  event.currentTarget.value = ''
                }}
              />
              <Paperclip className="size-4" aria-hidden="true" />
            </label>
          </div>
        </div>
      </form>
      {submitError ? (
        <Alert variant="destructive" className="mt-2 border-destructive/40">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Message failed</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}
      {footerText ? (
        <p className="mt-2 px-1 text-xs text-muted-foreground">{footerText}</p>
      ) : null}
    </div>
  )
}

function formatAttachmentMeta(file: File) {
  return `${getAttachmentLabel(file.type)} • ${formatBytes(file.size)}`
}

function getAttachmentLabel(mediaType: string) {
  if (mediaType === 'application/pdf') {
    return 'PDF'
  }

  if (mediaType.startsWith('image/')) {
    return 'Image'
  }

  return 'File'
}

function formatBytes(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getAttachmentFingerprint(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function isSupportedAttachment(file: File) {
  return file.type === 'application/pdf' || file.type.startsWith('image/')
}

function getProjectMention(
  input: string,
  caretPosition: number,
): ProjectMentionState | null {
  const beforeCaret = input.slice(0, caretPosition)
  const match = /(^|\s)@([^\s@]*)$/.exec(beforeCaret)
  if (!match) {
    return null
  }

  const prefix = match[1] ?? ''

  return {
    start: beforeCaret.length - match[0].length + prefix.length,
    end: caretPosition,
    query: match[2] ?? '',
  }
}

function getComposerErrorMessage(error: unknown): string {
  const fallback = 'Unable to send the message right now.'

  if (typeof error === 'string') {
    return sanitizeErrorMessage(error) || fallback
  }

  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message) || fallback
  }

  if (error && typeof error === 'object') {
    const value = error as {
      message?: unknown
      data?: unknown
    }

    if (typeof value.data === 'string') {
      return sanitizeErrorMessage(value.data) || fallback
    }

    if (
      value.data &&
      typeof value.data === 'object' &&
      'message' in value.data &&
      typeof value.data.message === 'string'
    ) {
      return sanitizeErrorMessage(value.data.message) || fallback
    }

    if (typeof value.message === 'string') {
      return sanitizeErrorMessage(value.message) || fallback
    }
  }

  return fallback
}

function sanitizeErrorMessage(message: string): string {
  const cleaned = message
    .replace(/\s*\[Request ID:[^\]]+\]\s*/g, ' ')
    .replace(/^Error:\s*/i, '')
    .trim()

  if (!cleaned || cleaned === 'Server Error') {
    return ''
  }

  if (cleaned === 'No model selected') {
    return 'Select a model before sending your message.'
  }

  return cleaned
}
