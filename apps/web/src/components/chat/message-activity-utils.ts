import {
  BookMarked,
  Database,
  PencilLine,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wrench,
  type AppIcon,
} from '@/lib/icons'
import { cn } from '@/lib/utils'
import {
  buildActivitySteps,
  getLastIncompleteStepId,
  getSearchEmptyState,
  isSearchTool,
  isStepActivelyLoading,
  type ActivityStatus,
  type ActivityStep,
  type ReasoningStep,
  type SearchSource,
  type ToolStep,
} from '@chat/shared/logic/message-activity-core'

export {
  buildActivitySteps,
  getLastIncompleteStepId,
  getSearchEmptyState,
  isSearchTool,
  isStepActivelyLoading,
  type ActivityStatus,
  type ActivityStep,
  type ReasoningStep,
  type SearchSource,
  type ToolStep,
}

export function getStepIcon(step: ActivityStep): AppIcon {
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

export function getStepIconClassName(step: ActivityStep, showActiveLoading: boolean) {
  const isTool = step.kind === 'tool'
  const isSearchToolStep = isTool && isSearchTool(step.toolName)
  const isMemoryTool = isTool && step.toolName.startsWith('memory_')

  return cn(
    'size-4 shrink-0',
    isStepActivelyLoading(step, showActiveLoading) && 'text-primary',
    !showActiveLoading && step.kind === 'reasoning' && step.status !== 'error' && 'text-primary',
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
