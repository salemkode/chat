import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
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
import { cn } from '@/lib/utils'

type ChatMessage = FunctionReturnType<
  typeof api.chat.listMessages
>['page'][number]
type PartRecord = Record<string, unknown>

export type ActivityStatus = 'complete' | 'running' | 'pending' | 'error'

export type ReasoningStep = {
  id: string
  kind: 'reasoning'
  title: string
  status: ActivityStatus
  body: string
  redacted?: boolean
}

export type SearchSource = {
  id: string
  url: string
  title: string
  description: string
}

export type ToolStep = {
  id: string
  kind: 'tool'
  title: string
  status: ActivityStatus
  toolName: string
  sources?: SearchSource[]
}

export type ActivityStep = ReasoningStep | ToolStep

export function buildActivitySteps(
  parts: ChatMessage['parts'],
  messageStatus: ChatMessage['status'],
) {
  const steps: ActivityStep[] = []
  const toolSteps = new Map<string, ToolStep>()

  const safeParts = Array.isArray(parts) ? parts : []

  for (const [index, rawPart] of safeParts.entries()) {
    const part = toPartRecord(rawPart)
    const partType = getPartType(part)

    if (partType === 'reasoning') {
      steps.push({
        id: `reasoning-${index}`,
        kind: 'reasoning',
        title: 'Reasoning',
        status: messageStatus === 'streaming' ? 'running' : 'complete',
        body: getString(part['text']) || '',
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
      const toolCallId = getString(part['toolCallId']) || `tool-${index}`
      const toolName = getToolName(part, partType)
      const step: ToolStep = {
        id: toolCallId,
        kind: 'tool',
        title: getToolDisplayTitle(toolName),
        status: getToolCallStatus(part, messageStatus),
        toolName,
        sources: isSearchTool(toolName) ? [] : undefined,
      }

      toolSteps.set(toolCallId, step)
      steps.push(step)
      continue
    }

    if (partType === 'tool-result') {
      const toolCallId = getString(part['toolCallId']) || `tool-result-${index}`
      const existing = toolSteps.get(toolCallId)

      if (existing) {
        existing.status = getBoolean(part['isError']) ? 'error' : 'complete'
        if (isSearchTool(existing.toolName)) {
          existing.sources = extractSearchSources(part['result'])
        }
        continue
      }

      const toolName = getString(part['toolName']) || 'tool'
      const step: ToolStep = {
        id: toolCallId,
        kind: 'tool',
        title: getToolDisplayTitle(toolName),
        status: getBoolean(part['isError']) ? 'error' : 'complete',
        toolName,
        sources: isSearchTool(toolName)
          ? extractSearchSources(part['result'])
          : undefined,
      }

      toolSteps.set(toolCallId, step)
      steps.push(step)
    }
  }

  return steps
}

export function getLastIncompleteStepId(steps: ActivityStep[]) {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index]
    if (step && (step.status === 'running' || step.status === 'pending')) {
      return step.id
    }
  }

  return null
}

export function getStepIcon(
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

  if (isSearchTool(step.toolName)) {
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

export function getStepIconClassName(
  step: ActivityStep,
  showActiveLoading: boolean,
) {
  const isTool = step.kind === 'tool'
  const isSearchToolStep = isTool && isSearchTool(step.toolName)
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
      isSearchToolStep &&
      step.status !== 'error' &&
      'text-sky-600 dark:text-sky-300',
    !showActiveLoading &&
      isMemoryTool &&
      step.status !== 'error' &&
      'text-teal-600 dark:text-teal-300',
    step.status === 'error' && 'text-destructive',
  )
}

export function isSearchTool(toolName: string) {
  return toolName === 'exa_web_search' || toolName === 'web_search'
}

export function getSearchEmptyState(status: ActivityStatus) {
  if (status === 'running' || status === 'pending') {
    return 'Searching the web for sources...'
  }

  if (status === 'error') {
    return 'Search failed before any sources were returned.'
  }

  return 'No sources were returned for this search.'
}

function getPartType(part: Record<string, unknown>) {
  return typeof part['type'] === 'string' ? part['type'] : ''
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
  const explicitToolName = getString(part['toolName'])

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
  const state = getString(part['state'])?.toLowerCase()

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
  if (isSearchTool(toolName)) {
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

function extractSearchSources(result: unknown): SearchSource[] {
  if (!isRecord(result) || !Array.isArray(result.results)) {
    return []
  }

  const seenUrls = new Set<string>()

  return result.results
    .flatMap((item, index) => {
      if (!isRecord(item)) {
        return []
      }

      const url = getString(item.url)
      if (!url || seenUrls.has(url)) {
        return []
      }

      seenUrls.add(url)

      return [
        {
          id: `${url}-${index}`,
          url,
          title: getString(item.title) || getDomainLabel(url),
          description:
            getString(item.snippet) ||
            getString(item.description) ||
            getString(item.text) ||
            url,
        },
      ]
    })
    .slice(0, 8)
}

function getDomainLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toPartRecord(value: unknown): PartRecord {
  return isRecord(value) ? value : {}
}

function getBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : false
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}
