import { useSmoothText } from '@convex-dev/agent/react'
import type { FunctionReturnType } from 'convex/server'
import {
  BookMarked,
  Database,
  LoaderCircle,
  PencilLine,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { api } from 'convex/_generated/api'
import { MarkdownContent } from '@/components/MarkdownContent'
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from '@/components/ui/chain-of-thought'
import { cn } from '@/lib/utils'

type ChatMessage = FunctionReturnType<
  typeof api.chat.listMessages
>['page'][number]
type MessagePart = ChatMessage['parts'][number]
type PartRecord = MessagePart & Record<string, unknown>

type ActivityStatus = 'complete' | 'running' | 'pending' | 'error'

type ReasoningStep = {
  id: string
  kind: 'reasoning'
  title: string
  status: ActivityStatus
  body: string
  redacted?: boolean
}

type ToolStep = {
  id: string
  kind: 'tool'
  title: string
  status: ActivityStatus
  toolName: string
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
  const activeStepId = useMemo(() => getLastIncompleteStepId(steps), [steps])

  if (steps.length === 0) {
    return null
  }

  return (
    <div className="mb-5 px-1">
      <ChainOfThought>
        {steps.map((step, index) => (
          <ActivityStepRow
            key={`${step.id}-${step.status}`}
            step={step}
            isLast={index === steps.length - 1}
            showActiveLoading={step.id === activeStepId}
          />
        ))}
      </ChainOfThought>
    </div>
  )
}

function ActivityStepRow({
  step,
  isLast,
  showActiveLoading,
}: {
  step: ActivityStep
  isLast: boolean
  showActiveLoading: boolean
}) {
  if (step.kind === 'reasoning') {
    return (
      <ReasoningRow
        step={step}
        isLast={isLast}
        showActiveLoading={showActiveLoading}
      />
    )
  }

  const Icon = getStepIcon(step, showActiveLoading)

  return (
    <ChainOfThoughtStep
      open={false}
      className={cn(isLast && 'pb-0')}
      data-last={isLast}
    >
      <ChainOfThoughtItem
        className={cn(
          'flex items-center gap-2.5 py-1 text-sm',
          step.status === 'error'
            ? 'text-destructive'
            : 'text-muted-foreground',
        )}
      >
        <Icon className={getStepIconClassName(step, showActiveLoading)} />
        <span className="truncate font-medium">{step.title}</span>
      </ChainOfThoughtItem>
    </ChainOfThoughtStep>
  )
}

function ReasoningRow({
  step,
  isLast,
  showActiveLoading,
}: {
  step: ReasoningStep
  isLast: boolean
  showActiveLoading: boolean
}) {
  const [isOpen, setIsOpen] = useState(step.status === 'running')
  const Icon = getStepIcon(step, showActiveLoading)
  const [reasoningText] = useSmoothText(step.body, {
    startStreaming: showActiveLoading && step.status === 'running',
  })

  return (
    <ChainOfThoughtStep
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(isLast && 'pb-0')}
      data-last={isLast}
    >
      <ChainOfThoughtTrigger
        leftIcon={
          <Icon className={getStepIconClassName(step, showActiveLoading)} />
        }
        swapIconOnHover={false}
        className="py-1 font-medium"
      >
        {step.title}
      </ChainOfThoughtTrigger>
      <ChainOfThoughtContent className="pt-2">
        <div className="px-0.5 py-1">
          {step.redacted ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {step.body || 'The provider kept the reasoning private.'}
            </p>
          ) : (
            <MarkdownContent
              content={
                showActiveLoading && step.status === 'running'
                  ? reasoningText
                  : step.body
              }
              className="max-w-none text-sm"
            />
          )}
        </div>
      </ChainOfThoughtContent>
    </ChainOfThoughtStep>
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
      steps.push({
        id: `reasoning-${index}`,
        kind: 'reasoning',
        title: 'Reasoning',
        status: messageStatus === 'streaming' ? 'running' : 'complete',
        body: getString(part.text) || '',
      })
      continue
    }

    if (partType === 'redacted-reasoning') {
      steps.push({
        id: `reasoning-${index}`,
        kind: 'reasoning',
        title: 'Reasoning',
        status: messageStatus === 'streaming' ? 'running' : 'complete',
        body: 'This provider returned a redacted reasoning trace.',
        redacted: true,
      })
      continue
    }

    if (isToolCallLikePart(partType)) {
      const toolCallId = getString(part.toolCallId) || `tool-${index}`
      const toolName = getToolName(part, partType)
      const step: ToolStep = {
        id: toolCallId,
        kind: 'tool',
        title: getToolDisplayTitle(toolName),
        status: getToolCallStatus(part, messageStatus),
        toolName,
      }

      toolSteps.set(toolCallId, step)
      steps.push(step)
      continue
    }

    if (partType === 'tool-result') {
      const toolCallId = getString(part.toolCallId) || `tool-result-${index}`
      const existing = toolSteps.get(toolCallId)

      if (existing) {
        existing.status = part.isError ? 'error' : 'complete'
        continue
      }

      const toolName = getString(part.toolName) || 'tool'
      const step: ToolStep = {
        id: toolCallId,
        kind: 'tool',
        title: getToolDisplayTitle(toolName),
        status: part.isError ? 'error' : 'complete',
        toolName,
      }

      toolSteps.set(toolCallId, step)
      steps.push(step)
    }
  }

  return steps
}

function getLastIncompleteStepId(steps: ActivityStep[]) {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index]
    if (step && (step.status === 'running' || step.status === 'pending')) {
      return step.id
    }
  }

  return null
}

function getStepIcon(
  step: ActivityStep,
  showActiveLoading: boolean,
): LucideIcon {
  if (
    showActiveLoading &&
    (step.status === 'running' || step.status === 'pending')
  ) {
    return LoaderCircle
  }

  if (step.status === 'error') {
    return TriangleAlert
  }

  if (step.kind === 'reasoning') {
    return Sparkles
  }

  if (step.toolName === 'exa_web_search' || step.toolName === 'web_search') {
    return Search
  }

  if (step.toolName === 'memory_search') {
    return Database
  }

  if (step.toolName === 'memory_add') {
    return BookMarked
  }

  if (step.toolName === 'memory_update') {
    return PencilLine
  }

  if (step.toolName === 'memory_delete') {
    return Trash2
  }

  return Wrench
}

function getStepIconClassName(step: ActivityStep, showActiveLoading: boolean) {
  const isTool = step.kind === 'tool'
  const isSearchTool =
    isTool &&
    (step.toolName === 'exa_web_search' || step.toolName === 'web_search')
  const isMemoryTool = isTool && step.toolName.startsWith('memory_')

  return cn(
    'size-4 shrink-0',
    showActiveLoading &&
      (step.status === 'running' || step.status === 'pending') &&
      'animate-spin text-primary',
    !showActiveLoading &&
      step.kind === 'reasoning' &&
      step.status !== 'error' &&
      'text-primary',
    !showActiveLoading &&
      isSearchTool &&
      step.status !== 'error' &&
      'text-sky-600 dark:text-sky-300',
    !showActiveLoading &&
      isMemoryTool &&
      step.status !== 'error' &&
      'text-teal-600 dark:text-teal-300',
    step.status === 'error' && 'text-destructive',
  )
}

function getPartType(part: Record<string, unknown>) {
  return typeof part.type === 'string' ? part.type : ''
}

function isToolCallLikePart(partType: string) {
  return (
    partType === 'tool-call' ||
    (partType.startsWith('tool-') &&
      partType !== 'tool-result' &&
      partType !== 'tool-calls')
  )
}

function getToolName(part: PartRecord, partType: string) {
  const explicitToolName = getString(part.toolName)

  if (explicitToolName) {
    return explicitToolName
  }

  if (partType.startsWith('tool-') && partType !== 'tool-call') {
    return partType.slice(5)
  }

  return 'tool'
}

function getToolCallStatus(
  part: PartRecord,
  messageStatus: ChatMessage['status'],
): ActivityStatus {
  const state = getString(part.state)?.toLowerCase()

  if (state) {
    if (
      state.includes('error') ||
      state.includes('failed') ||
      state.includes('denied')
    ) {
      return 'error'
    }

    if (
      state.includes('done') ||
      state.includes('complete') ||
      state.includes('output-available')
    ) {
      return 'complete'
    }

    if (
      state.includes('input-available') ||
      state.includes('running') ||
      state.includes('started') ||
      state.includes('in-progress')
    ) {
      return 'running'
    }
  }

  if (messageStatus === 'failed') {
    return 'error'
  }

  return messageStatus === 'streaming' || messageStatus === 'pending'
    ? 'running'
    : 'pending'
}

function getToolDisplayTitle(toolName: string) {
  if (toolName === 'exa_web_search' || toolName === 'web_search') {
    return 'Search'
  }

  if (toolName === 'memory_search') {
    return 'Memory'
  }

  if (toolName === 'memory_add') {
    return 'Save Memory'
  }

  if (toolName === 'memory_update') {
    return 'Update Memory'
  }

  if (toolName === 'memory_delete') {
    return 'Delete Memory'
  }

  return formatToolName(toolName)
}

function formatToolName(toolName: string) {
  const normalized = toolName.replace(/^tool-/, '')
  const words = normalized
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[_-\s]+/)
    .filter(Boolean)

  if (words.length === 0) {
    return 'Tool'
  }

  return words
    .map((word) =>
      /^[A-Z0-9]+$/.test(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}
