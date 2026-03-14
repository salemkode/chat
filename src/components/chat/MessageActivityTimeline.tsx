import { useSmoothText } from '@convex-dev/agent/react'
import type { FunctionReturnType } from 'convex/server'
import {
  Check,
  ChevronDown,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { api } from 'convex/_generated/api'
import { MarkdownContent } from '@/components/MarkdownContent'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type ChatMessage = FunctionReturnType<
  typeof api.chat.listMessages
>['page'][number]
type MessagePart = ChatMessage['parts'][number]
type ToolResultPart = Extract<MessagePart, { type: 'tool-result' }>
type PartRecord = MessagePart & Record<string, unknown>
type OutputEnvelope = Record<string, unknown> & {
  type: string
  value?: unknown
  reason?: unknown
}

type ActivityStatus = 'complete' | 'running' | 'pending' | 'error'

type ReasoningStep = {
  id: string
  kind: 'reasoning'
  title: string
  subtitle: string
  status: ActivityStatus
  body: string
  redacted?: boolean
}

type ToolStep = {
  id: string
  kind: 'tool'
  title: string
  subtitle: string
  status: ActivityStatus
  toolName: string
  args?: unknown
  output?: unknown
  isError?: boolean
}

type ActivityStep = ReasoningStep | ToolStep

interface MessageActivityTimelineProps {
  parts: ChatMessage['parts']
  messageStatus: ChatMessage['status']
}

export function MessageActivityTimeline({
  parts,
  messageStatus,
}: MessageActivityTimelineProps) {
  const steps = useMemo(
    () => buildActivitySteps(parts, messageStatus),
    [messageStatus, parts],
  )

  if (steps.length === 0) {
    return null
  }

  return (
    <div className="mb-5 rounded-3xl border border-border/70 bg-card/85 p-3 shadow-sm backdrop-blur-sm">
      <div className="space-y-3">
        {steps.map((step) => (
          <ActivityStepRow key={`${step.id}-${step.status}`} step={step} />
        ))}
      </div>
    </div>
  )
}

function ActivityStepRow({ step }: { step: ActivityStep }) {
  const canExpand =
    step.kind === 'reasoning'
      ? Boolean(step.body)
      : step.args !== undefined || step.output !== undefined
  const [isOpen, setIsOpen] = useState(step.status === 'error')

  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl border px-4 py-4 transition-colors',
        step.status === 'running' &&
          'border-primary/20 bg-primary/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
        step.status === 'complete' && 'border-border/60 bg-background/60',
        step.status === 'pending' && 'border-border/50 bg-background/40',
        step.status === 'error' && 'border-destructive/20 bg-destructive/5',
      )}
    >
      {canExpand ? (
        <button
          type="button"
          className="flex w-full items-start gap-3 text-left"
          onClick={() => setIsOpen((open) => !open)}
        >
          <StepSummary step={step} />
          <ChevronDown
            className={cn(
              'mt-1 size-4 shrink-0 text-muted-foreground transition-transform',
              isOpen && 'rotate-180',
            )}
          />
        </button>
      ) : (
        <div className="flex w-full items-start gap-3">
          <StepSummary step={step} />
        </div>
      )}

      {step.kind === 'tool' ? <ToolStepPreview step={step} /> : null}

      {canExpand && isOpen ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          {step.kind === 'reasoning' ? (
            <ReasoningStepBody step={step} />
          ) : (
            <ToolStepBody step={step} />
          )}
        </div>
      ) : null}
    </div>
  )
}

function StepSummary({ step }: { step: ActivityStep }) {
  return (
    <div className="min-w-0 flex flex-1 items-start gap-3">
      <div
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border',
          step.kind === 'reasoning' &&
            'border-primary/20 bg-primary/10 text-primary',
          step.kind === 'tool' &&
            'border-border/70 bg-muted/60 text-foreground',
        )}
      >
        {step.kind === 'reasoning' ? (
          <Sparkles className="size-4 shrink-0" />
        ) : (
          <Wrench className="size-4 shrink-0" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold text-foreground">
            {step.title}
          </p>
          <StepStatusBadge status={step.status} />
        </div>
        <p
          className={cn(
            'mt-1 text-sm text-muted-foreground',
            step.status === 'running' && 'shimmer text-muted-foreground/70',
          )}
        >
          {step.subtitle}
        </p>
      </div>
    </div>
  )
}

function ToolStepPreview({ step }: { step: ToolStep }) {
  const inputPreview = summarizeToolValue(step.args, 180)
  const outputPreview = summarizeToolValue(step.output, 220)

  if (!inputPreview && !outputPreview) {
    return null
  }

  return (
    <div className="mt-4 grid gap-2">
      {inputPreview ? (
        <PreviewBlock label="Input" value={inputPreview} tone="default" />
      ) : null}
      {outputPreview ? (
        <PreviewBlock
          label={step.isError ? 'Error' : 'Output'}
          value={outputPreview}
          tone={step.isError ? 'error' : 'default'}
        />
      ) : null}
    </div>
  )
}

function PreviewBlock({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'default' | 'error'
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-3 py-2.5 text-sm',
        tone === 'error'
          ? 'border-destructive/20 bg-destructive/5'
          : 'border-border/70 bg-muted/40',
      )}
    >
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'whitespace-pre-wrap break-words leading-6',
          tone === 'error' ? 'text-destructive' : 'text-foreground/90',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function StepStatusBadge({ status }: { status: ActivityStatus }) {
  if (status === 'running') {
    return (
      <Badge
        variant="outline"
        className="border-primary/20 bg-primary/5 text-primary"
      >
        <LoaderCircle className="size-3 animate-spin" />
        Running
      </Badge>
    )
  }

  if (status === 'error') {
    return (
      <Badge
        variant="outline"
        className="border-destructive/20 bg-destructive/5 text-destructive"
      >
        <TriangleAlert className="size-3" />
        Failed
      </Badge>
    )
  }

  if (status === 'pending') {
    return (
      <Badge variant="outline" className="border-border/60 bg-muted/40">
        Queued
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className="border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
    >
      <Check className="size-3" />
      Done
    </Badge>
  )
}

function ReasoningStepBody({ step }: { step: ReasoningStep }) {
  const [reasoningText] = useSmoothText(step.body, {
    startStreaming: step.status === 'running',
  })

  if (step.redacted) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        {step.body || 'The provider kept the reasoning private.'}
      </p>
    )
  }

  return (
    <MarkdownContent
      content={step.status === 'running' ? reasoningText : step.body}
      className="max-w-none text-sm"
    />
  )
}

function ToolStepBody({ step }: { step: ToolStep }) {
  return (
    <div className="space-y-3">
      {step.args !== undefined ? (
        <StructuredValue label="Input" value={step.args} tone="default" />
      ) : null}
      {step.output !== undefined ? (
        <StructuredValue
          label={step.isError ? 'Error' : 'Output'}
          value={step.output}
          tone={step.isError ? 'error' : 'default'}
        />
      ) : null}
    </div>
  )
}

function StructuredValue({
  label,
  value,
  tone,
}: {
  label: string
  value: unknown
  tone: 'default' | 'error'
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <pre
        className={cn(
          'max-h-80 overflow-auto rounded-2xl border px-3 py-2 text-xs leading-6 whitespace-pre-wrap break-words',
          tone === 'error'
            ? 'border-destructive/20 bg-destructive/5 text-destructive'
            : 'border-border/70 bg-muted/50 text-foreground',
        )}
      >
        {formatStructuredValue(normalizeStructuredValue(value))}
      </pre>
    </div>
  )
}

function buildActivitySteps(
  parts: ChatMessage['parts'],
  messageStatus: ChatMessage['status'],
) {
  const steps: ActivityStep[] = []
  const toolSteps = new Map<string, ToolStep>()

  for (const [index, rawPart] of parts.entries()) {
    const part = rawPart as PartRecord
    const partType = getPartType(part)

    if (partType === 'reasoning') {
      const reasoningText = getString(part.text) || ''
      steps.push({
        id: `reasoning-${index}`,
        kind: 'reasoning',
        title: 'Reasoning',
        subtitle:
          messageStatus === 'streaming'
            ? summarizeText(reasoningText, 84) || 'Working through the request'
            : summarizeText(reasoningText, 84) || 'Completed',
        status: messageStatus === 'streaming' ? 'running' : 'complete',
        body: reasoningText,
      })
      continue
    }

    if (partType === 'redacted-reasoning') {
      steps.push({
        id: `reasoning-${index}`,
        kind: 'reasoning',
        title: 'Reasoning',
        subtitle:
          messageStatus === 'streaming'
            ? 'Provider reasoning is still being prepared'
            : 'Provider kept the reasoning private',
        status: messageStatus === 'streaming' ? 'running' : 'complete',
        body: 'This provider returned a redacted reasoning trace.',
        redacted: true,
      })
      continue
    }

    if (isToolCallLikePart(partType)) {
      const step: ToolStep = {
        id: getString(part.toolCallId) || `tool-${index}`,
        kind: 'tool',
        title: formatToolName(getToolName(part, partType)),
        subtitle:
          summarizeToolArgs(getToolArgs(part)) ||
          (messageStatus === 'failed' ? 'Interrupted before completion' : 'Running'),
        status: getToolCallStatus(part, messageStatus),
        toolName: getToolName(part, partType),
        args: getToolArgs(part),
        output: getToolCallOutput(part),
      }

      toolSteps.set(step.id, step)
      steps.push(step)
      continue
    }

    if (isToolResultLikePart(partType)) {
      const toolCallId = getString(part.toolCallId) || `tool-result-${index}`
      const output = getToolResultOutput(part)
      const isError = Boolean(part.isError)
      const status = isError ? 'error' : 'complete'
      const existing = toolSteps.get(toolCallId)

      if (existing) {
        existing.status = status
        existing.subtitle =
          summarizeToolValue(output, 88) ||
          (isError ? 'Tool execution failed' : 'Completed')
        existing.output = output
        existing.isError = isError
        if (part.args !== undefined) {
          existing.args = part.args
        }
        continue
      }

      const toolName = getToolName(part, partType)
      const step: ToolStep = {
        id: toolCallId,
        kind: 'tool',
        title: formatToolName(toolName),
        subtitle:
          summarizeToolValue(output, 88) ||
          (isError ? 'Tool execution failed' : 'Completed'),
        status,
        toolName,
        args: getToolArgs(part),
        output,
        isError,
      }

      toolSteps.set(toolCallId, step)
      steps.push(step)
    }
  }

  return steps
}

function getPartType(part: PartRecord) {
  return getString(part.type) || ''
}

function isToolCallLikePart(partType: string) {
  return partType === 'tool-call' || (partType.startsWith('tool-') && !isToolResultLikePart(partType) && partType !== 'tool-calls')
}

function isToolResultLikePart(partType: string) {
  return partType === 'tool-result' || partType.endsWith('-result')
}

function getToolCallStatus(
  part: PartRecord,
  messageStatus: ChatMessage['status'],
): ActivityStatus {
  if (Boolean(part.isError) || messageStatus === 'failed') {
    return 'error'
  }

  if (part.outputAvailable) {
    return 'complete'
  }

  if (messageStatus === 'streaming' || messageStatus === 'pending') {
    return 'running'
  }

  return 'pending'
}

function getToolName(part: PartRecord, partType: string) {
  return (
    getString(part.toolName) ||
    getString(part.name) ||
    (partType.startsWith('tool-') ? partType.slice(5) : 'tool')
  )
}

function getToolArgs(part: PartRecord) {
  if (part.args !== undefined) {
    return part.args
  }

  if (part.input !== undefined) {
    return part.input
  }

  return undefined
}

function getToolCallOutput(part: PartRecord) {
  if (part.output !== undefined) {
    return part.output
  }

  if (part.result !== undefined) {
    return part.result
  }

  return undefined
}

function summarizeToolArgs(args: unknown) {
  return summarizeToolValue(args, 88)
}

function getToolResultOutput(part: PartRecord | ToolResultPart) {
  if (part.output !== undefined) {
    return part.output
  }

  if (part.result !== undefined) {
    return part.result
  }

  if ('experimental_content' in part && part.experimental_content !== undefined) {
    return part.experimental_content
  }

  return undefined
}

function formatToolName(toolName: string) {
  const words = toolName
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

  if (words.length === 0) {
    return 'Tool Call'
  }

  return words
    .map((word) =>
      /^[A-Z0-9]+$/.test(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

function summarizeToolValue(value: unknown, maxLength = 88) {
  if (value == null) {
    return ''
  }

  if (isOutputEnvelope(value)) {
    if (value.type === 'text' || value.type === 'error-text') {
      return summarizeText(getString(value.value) || '', maxLength)
    }

    if (value.type === 'json' || value.type === 'error-json') {
      return summarizeValue(value.value, maxLength)
    }

    if (value.type === 'content') {
      const textValue = (Array.isArray(value.value) ? value.value : [])
        .map((item) => getContentLabel(item))
        .join(' ')
      return summarizeText(textValue, maxLength)
    }

    if (value.type === 'execution-denied') {
      return summarizeText(
        getString(value.reason) || 'Execution denied',
        maxLength,
      )
    }
  }

  return summarizeValue(value, maxLength)
}

function summarizeValue(value: unknown, maxLength = 88) {
  if (typeof value === 'string') {
    return summarizeText(value, maxLength)
  }

  if (value == null) {
    return ''
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return ''
    }

    if (value.every((item) => typeof item === 'string')) {
      return summarizeText(value.join(', '), maxLength)
    }

    return `${value.length} item${value.length === 1 ? '' : 's'}`
  }

  if (isRecord(value)) {
    const query = getString(value.query)
    const title = getString(value.title)
    const message = getString(value.message)
    const text = getString(value.text)
    const url = getString(value.url)
    const resultCount = Array.isArray(value.results)
      ? value.results.length
      : null

    if (resultCount !== null && query) {
      return summarizeText(
        `${resultCount} result${resultCount === 1 ? '' : 's'} for ${query}`,
        maxLength,
      )
    }

    if (query) {
      return summarizeText(query, maxLength)
    }

    if (resultCount !== null) {
      return `${resultCount} result${resultCount === 1 ? '' : 's'}`
    }

    if (title) {
      return summarizeText(title, maxLength)
    }

    if (message) {
      return summarizeText(message, maxLength)
    }

    if (text) {
      return summarizeText(text, maxLength)
    }

    if (url) {
      return summarizeText(url, maxLength)
    }
  }

  try {
    return summarizeText(JSON.stringify(value), maxLength)
  } catch {
    return ''
  }
}

function summarizeText(value: string, maxLength = 88) {
  const normalized = value.replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return ''
  }

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`
}

function normalizeStructuredValue(value: unknown) {
  if (isOutputEnvelope(value)) {
    if ('value' in value) {
      return value.value
    }

    if (value.type === 'execution-denied') {
      return getString(value.reason) || 'Execution denied'
    }
  }

  return value
}

function formatStructuredValue(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function isOutputEnvelope(value: unknown): value is OutputEnvelope {
  return isRecord(value) && typeof value.type === 'string'
}

function getContentLabel(item: unknown) {
  if (!isRecord(item)) {
    return ''
  }

  const text = getString(item.text)
  if (text) {
    return text
  }

  const filename = getString(item.filename)
  if (filename) {
    return filename
  }

  const url = getString(item.url)
  if (url) {
    return url
  }

  const mediaType = getString(item.mediaType) || getString(item.mimeType)
  if (mediaType) {
    return mediaType
  }

  if (typeof item.fileId === 'string') {
    return item.fileId
  }

  return getString(item.type) || 'item'
}
