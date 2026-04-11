'use client'

import {
  ArrowUp,
  FileText,
  Folder,
  Globe,
  Paperclip,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
} from '@/lib/icons'
import { ModelSelector } from '@/components/model-selector'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useState, type ReactNode } from 'react'
import {
  formatAttachmentMeta,
  getTextAttachmentPreview,
  type MentionProjectOption,
  type TextAttachment,
} from './utils'

export type PendingAttachment = {
  id: string
  file: File
  previewUrl?: string
}

export function SelectedProjectBadge({
  selectedProject,
  mobile,
  onClear,
}: {
  selectedProject?: { id: string; name: string }
  mobile: boolean
  onClear: () => void
}) {
  if (!selectedProject) {
    return null
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        'max-w-full gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-foreground',
        mobile && 'bg-muted/55 px-3 py-1.5',
      )}
    >
      <Folder className="size-3" />
      <span className="max-w-52 truncate">{selectedProject.name}</span>
      <Button
        type="button"
        variant="plain"
        size="none"
        onClick={onClear}
        className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Clear selected project"
      >
        <X className="size-3" />
      </Button>
    </Badge>
  )
}

export function AttachmentGrid({
  attachments,
  mobile,
  onRemove,
}: {
  attachments: PendingAttachment[]
  mobile: boolean
  onRemove: (attachmentId: string) => void
}) {
  if (attachments.length === 0) {
    return null
  }

  return (
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
          <Button
            type="button"
            variant="plain"
            size="none"
            onClick={() => onRemove(attachment.id)}
            className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Remove ${attachment.file.name}`}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  )
}

export function TextAttachmentGrid({
  textAttachments,
  mobile,
  onRemove,
}: {
  textAttachments: TextAttachment[]
  mobile: boolean
  onRemove: (id: string) => void
}) {
  if (textAttachments.length === 0) return null

  return (
    <div className={cn('flex w-full flex-col gap-2', mobile && 'gap-2.5')}>
      {textAttachments.map((att) => (
        <TextAttachmentCard
          key={att.id}
          attachment={att}
          mobile={mobile}
          onRemove={() => onRemove(att.id)}
        />
      ))}
    </div>
  )
}

function TextAttachmentCard({
  attachment,
  mobile,
  onRemove,
}: {
  attachment: TextAttachment
  mobile: boolean
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const preview = getTextAttachmentPreview(attachment.text, 3)
  const charCount = attachment.text.length
  const lineCount = attachment.text.split('\n').length

  return (
    <div
      className={cn(
        'group flex min-w-0 flex-col rounded-2xl border border-border/70 bg-background/75',
        mobile && 'rounded-[1.15rem] bg-muted/30',
      )}
    >
      <div className="flex min-w-0 items-center gap-3 p-2.5">
        <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <FileText className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">
            {attachment.label}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {charCount.toLocaleString()} chars · {lineCount.toLocaleString()}{' '}
            {lineCount === 1 ? 'line' : 'lines'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="plain"
            size="none"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </Button>
          <Button
            type="button"
            variant="plain"
            size="none"
            onClick={onRemove}
            className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Remove pasted text"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
      {!expanded ? (
        <div className="border-t border-border/50 px-3 pb-2.5 pt-2">
          <pre className="line-clamp-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
            {preview}
          </pre>
        </div>
      ) : (
        <div className="max-h-60 overflow-y-auto border-t border-border/50 px-3 pb-2.5 pt-2">
          <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/80">
            {attachment.text}
          </pre>
        </div>
      )}
    </div>
  )
}

export function ProjectMentionPopup({
  projectMention,
  mentionOptions,
  highlightedProjectIndex,
  mobile = false,
  onSelect,
}: {
  projectMention: unknown
  mentionOptions: MentionProjectOption[]
  highlightedProjectIndex: number
  mobile?: boolean
  onSelect: (optionId: string) => void
}) {
  if (!projectMention) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute z-40 overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl',
        mobile
          ? 'bottom-[calc(100%+8px)] left-0 right-0'
          : 'bottom-[calc(100%+10px)] left-0 w-[min(19rem,calc(100vw-2rem))]',
      )}
    >
      <div className="max-h-56 overflow-y-auto">
        {mentionOptions.length > 0 ? (
          mentionOptions.map((option, index) => {
            const isHighlighted = index === highlightedProjectIndex

            return (
              <Button
                type="button"
                key={option.id}
                variant="plain"
                size="none"
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors',
                  isHighlighted
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(option.id)}
              >
                <div
                  className={cn(
                    'inline-flex size-6 shrink-0 items-center justify-center rounded-full border',
                    isHighlighted
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/70 bg-background text-muted-foreground',
                  )}
                >
                  {option.kind === 'new-project-ai' ? (
                    <Sparkles className="size-3" />
                  ) : (
                    <Folder className="size-3" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{option.name}</div>
                  {option.description ? (
                    <div className="truncate text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  ) : null}
                </div>
              </Button>
            )
          })
        ) : (
          <div className="px-2.5 py-3 text-sm text-muted-foreground">
            No matching projects.
          </div>
        )}
      </div>
    </div>
  )
}

export function ComposerActionRow({
  disabled,
  isSubmitting,
  value,
  attachments,
  textAttachments = [],
  mobile,
  selectedModel,
  onModelChange,
  searchEnabled,
  onToggleSearch,
  reasoningSupported,
  reasoningEnabled,
  onToggleReasoning,
  reasoningLevel,
  onReasoningLevel,
  reasoningLevels,
  defaultReasoningLevel,
  onAttach,
  contextMeter,
}: {
  disabled: boolean
  isSubmitting: boolean
  value: string
  attachments: PendingAttachment[]
  textAttachments?: TextAttachment[]
  mobile: boolean
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  searchEnabled: boolean
  onToggleSearch: () => void
  reasoningSupported: boolean
  reasoningEnabled: boolean
  onToggleReasoning: (value: boolean) => void
  reasoningLevel: 'low' | 'medium' | 'high'
  onReasoningLevel: (value: 'low' | 'medium' | 'high') => void
  reasoningLevels?: Array<'low' | 'medium' | 'high'>
  defaultReasoningLevel: 'off' | 'low' | 'medium' | 'high'
  onAttach: (files: FileList | null) => void
  contextMeter?: ReactNode
}) {
  const hasContent =
    value.trim() || attachments.length > 0 || textAttachments.length > 0
  return (
    <div
      className={cn(
        'flex w-full min-w-0 items-center justify-between',
        mobile ? 'mt-1 flex-row-reverse gap-3' : 'mt-2 flex-row-reverse',
      )}
    >
      <div className="inline-flex items-center gap-2">
        {contextMeter}
        <Button
          type="submit"
          size={mobile ? 'icon-lg' : 'icon'}
          disabled={disabled || isSubmitting || !hasContent}
          aria-label={
            isSubmitting
              ? 'Sending message'
              : hasContent
                ? 'Send message'
                : 'Message requires text or a supported file'
          }
          className={cn(
            'inline-flex items-center justify-center bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary disabled:active:bg-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
            mobile
              ? 'h-[52px] min-w-[52px] rounded-full px-4 shadow-sm'
              : 'h-12 min-w-12 rounded-full px-3',
          )}
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </Button>
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
            mobile && 'min-w-0 flex-1 [&_button]:h-11 [&_button]:w-full',
          )}
        />

        <Button
          type="button"
          variant="plain"
          size="none"
          onClick={onToggleSearch}
          aria-label={searchEnabled ? 'Disable search' : 'Enable search'}
          className={cn(
            'inline-flex items-center justify-center text-xs font-medium transition-colors hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
            mobile
              ? 'h-11 rounded-full border border-border/70 px-3.5'
              : 'h-8 rounded-full px-2.5',
            searchEnabled
              ? 'bg-muted/60 text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Globe className="size-4" />
        </Button>

        {reasoningSupported ? (
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-full border border-border/70 px-2',
              mobile ? 'h-11 px-3' : 'h-8',
            )}
          >
            <Switch
              checked={reasoningEnabled}
              onCheckedChange={onToggleReasoning}
              aria-label="Toggle reasoning"
            />
            {reasoningEnabled ? (
              <Select
                value={reasoningLevel}
                onValueChange={(value: string) =>
                  onReasoningLevel(value as 'low' | 'medium' | 'high')
                }
              >
                <SelectTrigger className="h-7 w-[92px] rounded-full border-0 bg-transparent px-2 text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-4xl">
                  {(reasoningLevels && reasoningLevels.length > 0
                    ? reasoningLevels
                    : defaultReasoningLevel !== 'off'
                      ? [defaultReasoningLevel as 'low' | 'medium' | 'high']
                      : ['low', 'medium', 'high']
                  ).map((level) => (
                    <SelectItem key={level} value={level} className="rounded-full">
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ) : null}

        <Label
          htmlFor="composer-attachment-input"
          className={cn(
            'inline-flex cursor-pointer items-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
            mobile
              ? 'h-11 rounded-full border border-border/70 px-3.5'
              : 'h-8 rounded-full px-2.5',
          )}
          aria-label="Attach a file"
        >
          {/* Native file inputs are required for the browser file picker. */}
          <Input
            id="composer-attachment-input"
            multiple
            accept="image/*,application/pdf"
            className="sr-only"
            type="file"
            onChange={(event) => {
              onAttach(event.target.files)
              event.currentTarget.value = ''
            }}
          />
          <Paperclip className="size-4" aria-hidden="true" />
        </Label>
      </div>
    </div>
  )
}
