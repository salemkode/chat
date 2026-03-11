import { v } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'

export const memoryScopeValidator = v.union(
  v.literal('user'),
  v.literal('thread'),
  v.literal('project'),
)

export const publicMemoryScopeValidator = v.union(
  memoryScopeValidator,
  v.literal('all'),
)

export const userMemorySourceValidator = v.union(
  v.literal('manual'),
  v.literal('extracted'),
  v.literal('system'),
)

export const scopedMemorySourceValidator = v.union(
  v.literal('manual'),
  v.literal('extracted'),
)

export const extractionStatusValidator = v.union(
  v.literal('idle'),
  v.literal('running'),
  v.literal('error'),
)

export type MemoryScope = 'user' | 'thread' | 'project'
export type PublicMemoryScope = MemoryScope | 'all'

export type MemoryListItem = {
  memoryId: string
  scope: MemoryScope
  title: string
  content: string
  category?: string
  tags?: string[]
  source: string
  userId: string
  threadId?: string
  projectId?: string
  originThreadId?: string
  originMessageIds?: string[]
  createdAt: number
  updatedAt: number
}

export type AnyMemoryDoc =
  | Doc<'userMemories'>
  | Doc<'threadMemories'>
  | Doc<'projectMemories'>

export function normalizeMemoryContent(content: string) {
  return content.replace(/\r\n/g, '\n').trim()
}

export function normalizeOptionalString(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export function normalizeTags(tags?: string[]) {
  if (!tags?.length) return undefined

  const normalized = Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.toLowerCase()),
    ),
  )

  return normalized.length > 0 ? normalized : undefined
}

export async function hashMemoryContent(content: string) {
  const normalized = normalizeMemoryContent(content).toLowerCase()
  const encoded = new TextEncoder().encode(normalized)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export function buildRagKey(scope: MemoryScope, memoryId: string) {
  return `memory:${scope}:${memoryId}`
}

export function buildRagFilterValues(args: {
  userId: Id<'users'>
  threadId?: string | null
  projectId?: Id<'projects'> | null
}) {
  return [
    { name: 'userId', value: args.userId },
    { name: 'threadId', value: args.threadId ?? null },
    { name: 'projectId', value: args.projectId ?? null },
  ]
}

export function mergeStringLists(existing?: string[], incoming?: string[]) {
  const merged = normalizeTags([...(existing ?? []), ...(incoming ?? [])])
  return merged
}

export function scopeToTable(scope: MemoryScope) {
  switch (scope) {
    case 'user':
      return 'userMemories' as const
    case 'thread':
      return 'threadMemories' as const
    case 'project':
      return 'projectMemories' as const
  }
}

export function formatMemory(
  scope: MemoryScope,
  memory: AnyMemoryDoc,
): MemoryListItem {
  return {
    memoryId: memory._id.toString(),
    scope,
    title: memory.title,
    content: memory.content,
    category: memory.category,
    tags: memory.tags,
    source: memory.source,
    userId: memory.userId.toString(),
    threadId: 'threadId' in memory ? memory.threadId : undefined,
    projectId: 'projectId' in memory ? memory.projectId.toString() : undefined,
    originThreadId: memory.originThreadId,
    originMessageIds: memory.originMessageIds,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
  }
}

export function matchesMemoryFilters(
  memory: MemoryListItem,
  args: {
    category?: string
    source?: string
    tags?: string[]
    query?: string
  },
) {
  if (args.category && memory.category !== args.category) {
    return false
  }

  if (args.source && memory.source !== args.source) {
    return false
  }

  if (
    args.tags?.length &&
    !args.tags.every((tag) => memory.tags?.includes(tag.toLowerCase()))
  ) {
    return false
  }

  if (args.query) {
    const needle = args.query.trim().toLowerCase()
    if (
      needle &&
      !`${memory.title}\n${memory.content}\n${memory.category ?? ''}\n${memory.tags?.join(' ') ?? ''}`
        .toLowerCase()
        .includes(needle)
    ) {
      return false
    }
  }

  return true
}

export function paginateMemories<T>(
  items: T[],
  args: {
    cursor?: string
    limit?: number
  },
) {
  const limit = Math.max(1, Math.min(args.limit ?? 50, 200))
  const offset = Number(args.cursor ?? '0')
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0
  const page = items.slice(safeOffset, safeOffset + limit)
  const nextOffset = safeOffset + page.length

  return {
    page,
    isDone: nextOffset >= items.length,
    continueCursor: nextOffset >= items.length ? null : String(nextOffset),
    total: items.length,
  }
}

export function extractMessageText(
  message:
    | {
        text?: string
        message?: {
          content?: unknown
          role?: string
        }
      }
    | null
    | undefined,
) {
  if (!message) return ''
  if (typeof message.text === 'string' && message.text.trim()) {
    return message.text.trim()
  }

  const content = message.message?.content
  if (typeof content === 'string') {
    return content.trim()
  }

  if (!Array.isArray(content)) {
    return ''
  }

  const text = content
    .flatMap((part) => {
      if (!part || typeof part !== 'object') return []
      if ('type' in part && part.type === 'text' && 'text' in part) {
        return [String(part.text)]
      }
      return []
    })
    .join('\n')
    .trim()

  return text
}

const EPHEMERAL_PATTERN =
  /\b(today|tonight|tomorrow|right now|currently|for now|this week|this morning|this afternoon|this evening|temporarily)\b/i

export function shouldSkipExtractedMemory(args: {
  title: string
  content: string
}) {
  const content = `${args.title} ${args.content}`.trim()
  if (content.length < 12) return true
  return EPHEMERAL_PATTERN.test(content)
}
