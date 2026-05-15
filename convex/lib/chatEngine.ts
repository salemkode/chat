import type { Doc, Id } from '../_generated/dataModel'

export type ChatMessageStatus = 'pending' | 'success' | 'failed'
export type ChatMessageRole = 'system' | 'user' | 'assistant' | 'tool'

export type PublicChatMessage = {
  id: string
  _id: string
  _creationTime: number
  key: string
  role: 'system' | 'user' | 'assistant'
  text: string
  parts: Array<Record<string, unknown>>
  status: ChatMessageStatus | 'streaming'
  order: number
  stepOrder: number
  agentName?: string
  userId?: string
  failureKind?: 'stopped' | 'error'
  failureMode?: 'replace' | 'clarify'
  failureNote?: string
}

type StoredMessageLike = Pick<
  Doc<'chatMessages'>,
  | '_id'
  | '_creationTime'
  | 'threadId'
  | 'status'
  | 'order'
  | 'stepOrder'
  | 'text'
  | 'parts'
  | 'agentName'
  | 'userId'
  | 'error'
  | 'message'
>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function getBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function getStoredRole(message: Pick<Doc<'chatMessages'>, 'message'>): ChatMessageRole {
  const role = message.message?.role
  return role ?? 'assistant'
}

type NormalizeChatThreadIdCtx = {
  db: {
    normalizeId(tableName: 'chatThreads', value: string): Id<'chatThreads'> | null
  }
}

export function isChatThreadId(ctx: NormalizeChatThreadIdCtx, value: string) {
  return ctx.db.normalizeId('chatThreads', value) !== null
}

export function normalizeChatThreadId(ctx: NormalizeChatThreadIdCtx, value: string) {
  return ctx.db.normalizeId('chatThreads', value)
}

export function extractTextFromParts(parts: unknown) {
  if (!Array.isArray(parts)) {
    return ''
  }

  return parts
    .flatMap((part) => {
      if (!isRecord(part) || part.type !== 'text') {
        return []
      }

      const text = getString(part.text)
      return text ? [text] : []
    })
    .join(' ')
    .trim()
}

export function publicChatMessage(
  message: StoredMessageLike,
  failure?: {
    kind: 'stopped' | 'error'
    mode: 'replace' | 'clarify'
    note: string
  },
): PublicChatMessage | null {
  const role = getStoredRole(message)
  if (role !== 'system' && role !== 'user' && role !== 'assistant') {
    return null
  }

  const parts = message.parts.flatMap((part) => (isRecord(part) ? [part] : []))
  const text = message.text ?? extractTextFromParts(parts)

  return {
    id: message._id,
    _id: message._id,
    _creationTime: message._creationTime,
    key: `${message.threadId}-${message.order}-${message.stepOrder}`,
    role,
    text,
    parts,
    status: message.status,
    order: message.order,
    stepOrder: message.stepOrder,
    agentName: message.agentName,
    userId: message.userId?.toString(),
    failureKind: failure?.kind,
    failureMode: failure?.mode,
    failureNote: failure?.note,
  }
}

export function buildUserParts(args: {
  text?: string
  files?: Array<{
    url: string
    mediaType: string
    filename?: string
  }>
}) {
  const parts: Array<Record<string, unknown>> = []
  const text = args.text?.trim()
  if (text) {
    parts.push({ type: 'text', text, state: 'done' })
  }

  for (const file of args.files ?? []) {
    parts.push({
      type: 'file',
      url: file.url,
      mediaType: file.mediaType,
      filename: file.filename,
    })
  }

  return parts
}

export function buildStoredMessage(role: ChatMessageRole, parts: Array<Record<string, unknown>>) {
  return {
    role,
    content: parts,
  }
}

function findPartById(parts: Array<Record<string, unknown>>, idKey: string, id: string) {
  return parts.find((part) => part[idKey] === id)
}

function ensureTextPart(
  parts: Array<Record<string, unknown>>,
  textId: string,
  kind: 'text' | 'reasoning',
) {
  const existing = findPartById(parts, 'id', textId)
  if (existing) {
    return existing
  }

  const part = { type: kind, id: textId, text: '', state: 'streaming' }
  parts.push(part)
  return part
}

function appendText(part: Record<string, unknown>, delta: string) {
  part.text = `${getString(part.text) ?? ''}${delta}`
}

function finishTextPart(part: Record<string, unknown>) {
  part.state = 'done'
}

function getToolPartType(toolName: string, dynamic: boolean | undefined) {
  return dynamic ? 'dynamic-tool' : `tool-${toolName}`
}

function ensureToolPart(
  parts: Array<Record<string, unknown>>,
  args: {
    toolCallId: string
    toolName: string
    dynamic?: boolean
  },
) {
  const existing = findPartById(parts, 'toolCallId', args.toolCallId)
  if (existing) {
    if (!getString(existing.toolName)) {
      existing.toolName = args.toolName
    }
    return existing
  }

  const part: Record<string, unknown> = {
    type: getToolPartType(args.toolName, args.dynamic),
    toolName: args.toolName,
    toolCallId: args.toolCallId,
    state: 'input-streaming',
  }
  parts.push(part)
  return part
}

export function buildAssistantPartsFromChunks(chunks: readonly unknown[]) {
  const parts: Array<Record<string, unknown>> = []

  for (const rawChunk of chunks) {
    if (!isRecord(rawChunk)) {
      continue
    }

    const chunkType = getString(rawChunk.type)
    if (!chunkType) {
      continue
    }

    if (chunkType === 'text-start') {
      const id = getString(rawChunk.id)
      if (id) {
        ensureTextPart(parts, id, 'text')
      }
      continue
    }

    if (chunkType === 'text-delta') {
      const id = getString(rawChunk.id)
      const delta = getString(rawChunk.delta)
      if (id && delta) {
        appendText(ensureTextPart(parts, id, 'text'), delta)
      }
      continue
    }

    if (chunkType === 'text-end') {
      const id = getString(rawChunk.id)
      if (id) {
        finishTextPart(ensureTextPart(parts, id, 'text'))
      }
      continue
    }

    if (chunkType === 'reasoning-start') {
      const id = getString(rawChunk.id)
      if (id) {
        ensureTextPart(parts, id, 'reasoning')
      }
      continue
    }

    if (chunkType === 'reasoning-delta') {
      const id = getString(rawChunk.id)
      const delta = getString(rawChunk.delta)
      if (id && delta) {
        appendText(ensureTextPart(parts, id, 'reasoning'), delta)
      }
      continue
    }

    if (chunkType === 'reasoning-end') {
      const id = getString(rawChunk.id)
      if (id) {
        finishTextPart(ensureTextPart(parts, id, 'reasoning'))
      }
      continue
    }

    if (
      chunkType === 'source-url' ||
      chunkType === 'source-document' ||
      chunkType === 'file' ||
      chunkType === 'start-step'
    ) {
      parts.push({ ...rawChunk })
      continue
    }

    if (chunkType === 'tool-input-start') {
      const toolCallId = getString(rawChunk.toolCallId)
      const toolName = getString(rawChunk.toolName)
      if (toolCallId && toolName) {
        const part = ensureToolPart(parts, {
          toolCallId,
          toolName,
          dynamic: getBoolean(rawChunk.dynamic),
        })
        part.state = 'input-streaming'
        part.providerExecuted = getBoolean(rawChunk.providerExecuted)
        part.title = getString(rawChunk.title)
      }
      continue
    }

    if (chunkType === 'tool-input-delta') {
      const toolCallId = getString(rawChunk.toolCallId)
      if (toolCallId) {
        const part = findPartById(parts, 'toolCallId', toolCallId)
        if (part) {
          part.inputText = `${getString(part.inputText) ?? ''}${getString(rawChunk.inputTextDelta) ?? ''}`
        }
      }
      continue
    }

    if (chunkType === 'tool-input-available' || chunkType === 'tool-input-error') {
      const toolCallId = getString(rawChunk.toolCallId)
      const toolName = getString(rawChunk.toolName)
      if (toolCallId && toolName) {
        const part = ensureToolPart(parts, {
          toolCallId,
          toolName,
          dynamic: getBoolean(rawChunk.dynamic),
        })
        part.state = chunkType === 'tool-input-error' ? 'input-error' : 'input-available'
        part.input = rawChunk.input
        part.args = rawChunk.input
        part.providerExecuted = getBoolean(rawChunk.providerExecuted)
        part.title = getString(rawChunk.title)
        if (chunkType === 'tool-input-error') {
          part.errorText = getString(rawChunk.errorText)
        }
      }
      continue
    }

    if (
      chunkType === 'tool-output-available' ||
      chunkType === 'tool-output-error' ||
      chunkType === 'tool-output-denied'
    ) {
      const toolCallId = getString(rawChunk.toolCallId)
      if (toolCallId) {
        const part = findPartById(parts, 'toolCallId', toolCallId)
        if (part) {
          part.state =
            chunkType === 'tool-output-available'
              ? 'output-available'
              : chunkType === 'tool-output-error'
                ? 'output-error'
                : 'output-denied'
          part.output = rawChunk.output
          part.result = rawChunk.output
          part.errorText = getString(rawChunk.errorText)
          part.providerExecuted = getBoolean(rawChunk.providerExecuted)
          part.preliminary = getBoolean(rawChunk.preliminary)
        }
      }
    }
  }

  return parts.map((part) => {
    if ((part.type === 'text' || part.type === 'reasoning') && part.state === 'streaming') {
      return { ...part, state: 'done' }
    }
    return part
  })
}

export function publicStreamingMessage(args: {
  threadId: Id<'chatThreads'>
  streamId: Id<'chatStreamingMessages'>
  creationTime: number
  order: number
  stepOrder: number
  status: 'streaming' | 'finished' | 'aborted'
  agentName?: string
  userId?: Id<'users'>
  chunks: readonly unknown[]
}): PublicChatMessage {
  const parts = buildAssistantPartsFromChunks(args.chunks)
  const text = extractTextFromParts(parts)

  return {
    id: `stream:${args.streamId}`,
    _id: `stream:${args.streamId}`,
    _creationTime: args.creationTime,
    key: `${args.threadId}-${args.order}-${args.stepOrder}`,
    role: 'assistant',
    text,
    parts,
    status: args.status === 'streaming' ? 'streaming' : args.status === 'finished' ? 'success' : 'failed',
    order: args.order,
    stepOrder: args.stepOrder,
    agentName: args.agentName,
    userId: args.userId?.toString(),
  }
}

export function sortPublicMessages(messages: PublicChatMessage[]) {
  return [...messages].sort((a, b) => a.order - b.order || a.stepOrder - b.stepOrder)
}

export function dedupePublicMessages(messages: PublicChatMessage[]) {
  const sorted = sortPublicMessages(messages)
  const output: PublicChatMessage[] = []

  for (const message of sorted) {
    const previous = output[output.length - 1]
    if (!previous || previous.order !== message.order || previous.stepOrder !== message.stepOrder) {
      output.push(message)
      continue
    }

    if (
      (previous.status === 'pending' || previous.status === 'streaming') &&
      message.status !== 'pending'
    ) {
      output[output.length - 1] = message
    }
  }

  return output
}
