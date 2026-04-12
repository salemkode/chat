import { useSmoothText } from '@convex-dev/agent/react'
import type { FunctionReturnType } from 'convex/server'
import { useMemo, useState } from 'react'
import { api } from '@convex/_generated/api'
import { MarkdownContent } from '@/components/MarkdownContent'
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from '@/components/ui/chain-of-thought'
import { OriginalThinkingLoader } from '@/components/ui/original-thinking-loader'
import { Source, SourceContent, SourceTrigger } from '@/components/ui/source'
import {
  buildActivitySteps,
  getLastIncompleteStepId,
  getSearchEmptyState,
  getStepIcon,
  getStepIconClassName,
  isStepActivelyLoading,
  isSearchTool,
  type ActivityStep,
  type ReasoningStep,
  type ToolStep,
} from '@/components/chat/message-activity-utils'
import { cn } from '@/lib/utils'

type ChatMessage = FunctionReturnType<
  typeof api.chat.listMessages
>['page'][number]

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

  if (isSearchTool(step.toolName)) {
    return (
      <SearchToolRow
        step={step}
        isLast={isLast}
        showActiveLoading={showActiveLoading}
      />
    )
  }

  const Icon = getStepIcon(step, showActiveLoading)
  const leftIcon = isStepActivelyLoading(step, showActiveLoading) ? (
    <OriginalThinkingLoader />
  ) : (
    <Icon className={getStepIconClassName(step, showActiveLoading)} />
  )

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
        {leftIcon}
        <span className="truncate font-medium">{step.title}</span>
        <ActivityCount count={step.count} />
      </ChainOfThoughtItem>
    </ChainOfThoughtStep>
  )
}

function SearchToolRow({
  step,
  isLast,
  showActiveLoading,
}: {
  step: ToolStep
  isLast: boolean
  showActiveLoading: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const Icon = getStepIcon(step, showActiveLoading)
  const sources = step.sources ?? []
  const leftIcon = isStepActivelyLoading(step, showActiveLoading) ? (
    <OriginalThinkingLoader />
  ) : (
    <Icon className={getStepIconClassName(step, showActiveLoading)} />
  )

  return (
    <ChainOfThoughtStep
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(isLast && 'pb-0')}
      data-last={isLast}
    >
      <ChainOfThoughtTrigger
        leftIcon={leftIcon}
        swapIconOnHover={false}
        className="py-1 font-medium"
      >
        <span className="truncate">{step.title}</span>
        <ActivityCount count={step.count} />
      </ChainOfThoughtTrigger>
      <ChainOfThoughtContent className="pt-2">
        <div className="px-0.5 py-1">
          {sources.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <Source key={source.id} href={source.url}>
                  <SourceTrigger showFavicon />
                  <SourceContent
                    title={source.title}
                    description={source.description}
                  />
                </Source>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              {getSearchEmptyState(step.toolName, step.status)}
            </p>
          )}
        </div>
      </ChainOfThoughtContent>
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
  const [isOpen, setIsOpen] = useState(false)
  const Icon = getStepIcon(step, showActiveLoading)
  const [reasoningText] = useSmoothText(step.body, {
    startStreaming: showActiveLoading && step.status === 'running',
  })
  const leftIcon = isStepActivelyLoading(step, showActiveLoading) ? (
    <OriginalThinkingLoader />
  ) : (
    <Icon className={getStepIconClassName(step, showActiveLoading)} />
  )

  return (
    <ChainOfThoughtStep
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn(isLast && 'pb-0')}
      data-last={isLast}
    >
      <ChainOfThoughtTrigger
        leftIcon={leftIcon}
        swapIconOnHover={false}
        className="py-1 font-medium"
      >
        {step.title}
        <ActivityCount count={step.count} />
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

function ActivityCount({ count }: { count: number }) {
  if (count < 2) {
    return null
  }

  return (
    <span className="ml-2 inline-flex rounded-full border border-border/60 px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
      {count}x
    </span>
  )
}
