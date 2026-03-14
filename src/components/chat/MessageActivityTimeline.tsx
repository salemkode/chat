import { useSmoothText } from '@convex-dev/agent/react'
import type { FunctionReturnType } from 'convex/server'
import {
  Check,
  ChevronDown,
  Circle,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from 'convex/_generated/api'
import { cn } from '@/lib/utils'
import { MarkdownContent } from '@/components/MarkdownContent'

type ChatMessage = FunctionReturnType<typeof api.chat.listMessages>['page'][number]
type MessagePart = ChatMessage['parts'][number]
type ToolResultPart = Extract<MessagePart, { type: 'tool-result' }>

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
    <div className="mb-5 rounded-[1.5rem] border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur-sm">
      <div className="space-y-1">
        {steps.map((step, index) => (
          <ActivityStepRow
            key={step.id}
            step={step}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

function ActivityStepRow({
  step,
  isLast,
}: {
  step: ActivityStep
  isLast: boolean
}) {
  const canExpand =
    step.kind === 'reasoning'
      ? Boolean(step.body)
      : step.args !== undefined || step.output !== undefined
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (step.status === 'running') {
      setIsOpen(false)
    }
  }, [step.status])

  const statusIcon = getStatusIcon(step)

  return (
    <div className="relative flex gap-3">
      <div className="relative flex w-6 shrink-0 justify-center">
        {!isLast ? (
          <div className="absolute left-1/2 top-6 bottom-[-0.75rem] w-px -translate-x-1/2 bg-border/80" />
        ) : null}
        <div
          className={cn(
            'relative z-10 mt-1 flex size-6 items-center justify-center rounded-full border bg-background',
            step.status === 'complete' &&
              'border-foreground/90 bg-foreground text-background',
            step.status === 'running' &&
              'border-border bg-background text-muted-foreground',
            step.status === 'pending' &&
              'border-border/80 bg-background text-transparent',
            step.status === 'error' &&
              'border-destructive/40 bg-destructive/10 text-destructive',
          )}
        >
          {statusIcon}
        </div>
      </div>

      <div
        className={cn(
          'min-w-0 flex-1 rounded-2xl px-4 py-3 transition-colors',
          step.status === 'running' && 'bg-muted/70',
          step.status === 'complete' && 'bg-transparent',
          step.status === 'pending' && 'bg-transparent',
          step.status === 'error' && 'bg-destructive/5',
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
                'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform',
                isOpen && 'rotate-180',
              )}
            />
          </button>
        ) : (
          <div className="flex w-full items-start gap-3">
            <StepSummary step={step} />
          </div>
        )}

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
    </div>
  )
}

function StepSummary({ step }: { step: ActivityStep }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        {step.kind === 'reasoning' ? (
          <Sparkles className="size-4 shrink-0 text-primary" />
        ) : (
          <Wrench className="size-4 shrink-0 text-primary" />
        )}
        <p className="truncate text-sm font-semibold text-foreground">
          {step.title}
        </p>
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
        <StructuredValue
          label="Input"
          value={step.args}
          tone="default"
        />
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
          'overflow-x-auto rounded-2xl border px-3 py-2 text-xs leading-6 whitespace-pre-wrap break-words',
          tone === 'error'
            ? 'border-destructive/20 bg-destructive/5 text-destructive'
            : 'border-border/70 bg-muted/50 text-foreground',
        )}
      >
        {formatStructuredValue(value)}
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

  for (const [index, part] of parts.entries()) {
    if (part.type === 'reasoning') {
      steps.push({
        id: `reasoning-${index}`,
        kind: 'reasoning',
        title: 'Reasoning',
        subtitle:
          messageStatus === 'streaming'
            ? summarizeText(part.text, 84) || 'Working through the request'
            : summarizeText(part.text, 84) || 'Completed',
        status: messageStatus === 'streaming' ? 'running' : 'complete',
        body: part.text,
      })
      continue
    }

    if (part.type === 'redacted-reasoning') {
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

    if (part.type === 'tool-call') {
      const step: ToolStep = {
        id: part.toolCallId,
        kind: 'tool',
        title: formatToolName(part.toolName),
        subtitle:
          summarizeToolArgs(part.args) ||
          (messageStatus === 'failed' ? 'Interrupted before completion' : 'Running'),
        status:
          messageStatus === 'failed'
            ? 'error'
            : messageStatus === 'streaming' || messageStatus === 'pending'
              ? 'running'
              : 'pending',
        toolName: part.toolName,
        args: part.args,
      }

      toolSteps.set(part.toolCallId, step)
      steps.push(step)
      continue
    }

    if (part.type === 'tool-result') {
      const output = getToolOutput(part)
      const status = part.isError ? 'error' : 'complete'
      const existing = toolSteps.get(part.toolCallId)

      if (existing) {
        existing.status = status
        existing.subtitle =
          summarizeToolOutput(part) ||
          (part.isError ? 'Tool execution failed' : 'Completed')
        existing.output = output
        existing.isError = part.isError
        if (part.args !== undefined) {
          existing.args = part.args
        }
        continue
      }

      const step: ToolStep = {
        id: part.toolCallId,
        kind: 'tool',
        title: formatToolName(part.toolName),
        subtitle:
          summarizeToolOutput(part) ||
          (part.isError ? 'Tool execution failed' : 'Completed'),
        status,
        toolName: part.toolName,
        args: part.args,
        output,
        isError: part.isError,
      }

      toolSteps.set(part.toolCallId, step)
      steps.push(step)
    }
  }

  return steps
}

function getStatusIcon(step: ActivityStep) {
  if (step.status === 'complete') {
    return <Check className="size-3.5" />
  }

  if (step.status === 'running') {
    return <LoaderCircle className="size-3.5 animate-spin" />
  }

  if (step.status === 'error') {
    return <TriangleAlert className="size-3.5" />
  }

  return <Circle className="size-3.5 fill-background text-border" />
}

function formatToolName(toolName: string) {
  return toolName
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase())
}

function summarizeToolArgs(args: unknown) {
  return summarizeValue(args, 88)
}

function summarizeToolOutput(part: ToolResultPart) {
  const output = part.output

  if (output?.type === 'text' || output?.type === 'error-text') {
    return summarizeText(output.value, 88)
  }

  if (output?.type === 'json' || output?.type === 'error-json') {
    return summarizeValue(output.value, 88)
  }

  if (output?.type === 'content') {
    const textValue = output.value
      .map(
        (
          item:
            | { text: string; type: 'text' }
            | { data: string; mediaType: string; type: 'media' },
        ) => ('text' in item ? item.text : item.mediaType),
      )
      .join(' ')
    return summarizeText(textValue, 88)
  }

  if (part.result !== undefined) {
    return summarizeValue(part.result, 88)
  }

  if (part.experimental_content?.length) {
    const textValue = part.experimental_content
      .map(
        (
          item:
            | { text: string; type: 'text' }
            | { data: string; mimeType?: string; type: 'image' },
        ) => ('text' in item ? item.text : item.mimeType || 'image'),
      )
      .join(' ')
    return summarizeText(textValue, 88)
  }

  return part.isError ? 'Tool execution failed' : 'Completed'
}

function getToolOutput(part: ToolResultPart) {
  if (part.output !== undefined) {
    return part.output
  }

  if (part.result !== undefined) {
    return part.result
  }

  if (part.experimental_content !== undefined) {
    return part.experimental_content
  }

  return undefined
}

function summarizeValue(value: unknown, maxLength = 88) {
  if (typeof value === 'string') {
    return summarizeText(value, maxLength)
  }

  if (value == null) {
    return ''
  }

  try {
    const serialized = JSON.stringify(value)
    return summarizeText(serialized, maxLength)
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
