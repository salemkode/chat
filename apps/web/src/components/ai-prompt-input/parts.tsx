'use client'

import { ArrowUp, FileText, Folder, Globe, Paperclip, X } from 'lucide-react'
import { ModelSelector } from '@/components/model-selector'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { formatAttachmentMeta } from './utils'

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
      <button
        type="button"
        onClick={onClear}
        className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Clear selected project"
      >
        <X className="size-3" />
      </button>
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
          <button
            type="button"
            onClick={() => onRemove(attachment.id)}
            className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Remove ${attachment.file.name}`}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function ProjectMentionPopup({
  projectMention,
  mentionProjects,
  highlightedProjectIndex,
  onSelect,
}: {
  projectMention: unknown
  mentionProjects: Array<{ id: string; name: string; description?: string }>
  highlightedProjectIndex: number
  onSelect: (projectId: string) => void
}) {
  if (!projectMention) {
    return null
  }

  return (
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
                onClick={() => onSelect(project.id)}
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
  )
}

export function ComposerActionRow({
  disabled,
  isSubmitting,
  value,
  attachments,
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
}: {
  disabled: boolean
  isSubmitting: boolean
  value: string
  attachments: PendingAttachment[]
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
}) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 items-center justify-between',
        mobile ? 'mt-1 flex-row-reverse gap-3' : 'mt-2 flex-row-reverse',
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
          mobile
            ? 'h-[52px] min-w-[52px] rounded-[1.1rem] px-4 shadow-sm'
            : 'h-12 min-w-12 rounded-xl px-3',
        )}
      >
        <ArrowUp className="size-5" aria-hidden="true" />
      </button>

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
              'min-w-0 flex-1 [&_button]:h-11 [&_button]:w-full [&_button]:justify-between [&_button]:gap-2 [&_button]:rounded-full [&_button]:border [&_button]:border-border/70 [&_button]:bg-background/90 [&_button]:px-3.5 [&_button]:text-sm [&_button]:shadow-sm',
          )}
        />

        <button
          type="button"
          onClick={onToggleSearch}
          aria-label={searchEnabled ? 'Disable search' : 'Enable search'}
          className={cn(
            'inline-flex items-center justify-center text-xs font-medium transition-colors hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
            mobile
              ? 'h-11 rounded-full border border-border/70 px-3.5'
              : 'h-8 rounded-lg px-2.5',
            searchEnabled
              ? 'bg-muted/60 text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Globe className="size-4" />
        </button>

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
                <SelectTrigger className="h-7 w-[92px] border-0 bg-transparent px-2 text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(reasoningLevels && reasoningLevels.length > 0
                    ? reasoningLevels
                    : defaultReasoningLevel !== 'off'
                      ? [defaultReasoningLevel as 'low' | 'medium' | 'high']
                      : ['low', 'medium', 'high']
                  ).map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ) : null}

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
        </label>
      </div>
    </div>
  )
}
