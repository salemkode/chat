const THREAD_TITLE_MAX_LENGTH = 60
const AUTO_METADATA_MESSAGE_THRESHOLD = 5
const AUTO_METADATA_STALE_AFTER_MS = 5 * 60 * 1000
const AUTO_METADATA_COOLDOWN_MS = 30 * 60 * 1000

const PLACEHOLDER_TITLES = new Set(['new chat', 'untitled', 'untitled chat'])
const WEAK_TITLES = new Set(['chat', 'question', 'help', 'discussion', 'conversation', 'project'])

export const TOOL_POLICY_VERSION = 'phase1-memory-metadata-v1'

export type ToolPolicyRequiredAction =
  | 'memory_search_required'
  | 'memory_add_required'
  | 'memory_update_required'
  | 'memory_delete_required'
  | 'metadata_update_required'

export type ToolPolicyDetectedIntent =
  | 'memory_search'
  | 'memory_add'
  | 'memory_update'
  | 'memory_delete'
  | 'metadata_refresh'
  | 'none'

export type ToolPolicyAutomaticAction = 'metadata_update_applied' | 'metadata_update_failed'

export type ToolPolicyEvaluation = {
  detectedIntent: ToolPolicyDetectedIntent
  requiredActions: ToolPolicyRequiredAction[]
  systemAddendum: string
  toolAvailability: {
    memoryTools: boolean
    threadMetadataTool: boolean
  }
  policyTrace: string[]
}

export type ThreadMetadataPolicyDecision = {
  requiredActions: ToolPolicyRequiredAction[]
  detectedIntent: Extract<ToolPolicyDetectedIntent, 'metadata_refresh' | 'none'>
  update: null | {
    title: string
    emoji: string
  }
  automaticActions: ToolPolicyAutomaticAction[]
  policyTrace: string[]
}

export type ToolPolicyFinalization = {
  observedTools: string[]
  satisfiedActions: ToolPolicyRequiredAction[]
  status: 'completed' | 'skipped' | 'failed'
  error?: string
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeTitle(title: string) {
  const cleaned = normalizeWhitespace(title).replace(/^["'\s]+|["'\s]+$/g, '')
  if (!cleaned) return ''
  if (cleaned.length <= THREAD_TITLE_MAX_LENGTH) {
    return cleaned
  }

  return cleaned.slice(0, THREAD_TITLE_MAX_LENGTH).trimEnd()
}

function normalizeLower(value: string) {
  return normalizeWhitespace(value).toLowerCase()
}

function hasMeaningfulTitleCandidate(text: string) {
  const normalized = normalizeWhitespace(text)
  if (normalized.length < 18) return false
  return normalized.split(/\s+/).length >= 4
}

function isPlaceholderThreadTitle(title: string | undefined, firstUserMessage: string) {
  const normalizedTitle = title?.trim().toLowerCase()
  if (!normalizedTitle) return true

  if (PLACEHOLDER_TITLES.has(normalizedTitle)) {
    return true
  }

  const firstSnippet = firstUserMessage.trim().replace(/\s+/g, ' ').slice(0, 30).toLowerCase()

  return firstSnippet.length > 0 && normalizedTitle === firstSnippet
}

function isWeakThreadTitle(title: string | undefined) {
  const normalizedTitle = normalizeLower(title ?? '')
  if (!normalizedTitle) return true
  if (PLACEHOLDER_TITLES.has(normalizedTitle)) return true
  if (WEAK_TITLES.has(normalizedTitle)) return true
  return normalizedTitle.split(' ').length <= 2 && WEAK_TITLES.has(normalizedTitle)
}

function deriveThreadTitleCandidate(text: string) {
  const normalized = normalizeWhitespace(text.split(/[\n.!?]/)[0] ?? text)
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[,:;]+$/g, '')

  if (!normalized) {
    return ''
  }

  const words = normalized.split(/\s+/)
  const preferred = words.slice(0, 7).join(' ')
  return normalizeTitle(preferred || normalized)
}

function deriveThreadEmojiCandidate(text: string) {
  const normalized = normalizeLower(text)

  if (/\b(bug|fix|error|issue|crash|debug)\b/.test(normalized)) return '🐛'
  if (/\b(api|backend|frontend|code|coding|typescript|react|convex)\b/.test(normalized)) {
    return '💻'
  }
  if (/\b(design|ui|ux|css|style|layout)\b/.test(normalized)) return '🎨'
  if (/\b(search|research|docs|documentation)\b/.test(normalized)) return '🔍'
  if (/\b(project|plan|roadmap|milestone|task)\b/.test(normalized)) return '📋'
  if (/\b(memory|remember|preference|profile)\b/.test(normalized)) return '🧠'

  return '💬'
}

function hasMemorySubjectHint(text: string) {
  return /\b(memory|remember|saved|save|preference|profile|default|stack|name|email|location)\b/.test(
    text,
  )
}

function detectMemoryIntent(prompt: string) {
  const normalized = normalizeLower(prompt)

  if (
    /\b(what|anything) do you remember( about me| about [^?!.]+)?\b/.test(normalized) ||
    /\bdo you remember\b/.test(normalized) ||
    /\bwhat did i tell you about\b/.test(normalized) ||
    /\bsearch (my )?memory\b/.test(normalized)
  ) {
    return {
      detectedIntent: 'memory_search' as const,
      requiredActions: ['memory_search_required'] as ToolPolicyRequiredAction[],
      systemAddendum:
        'POLICY: The user explicitly asked about saved memory. You must call `memory_search` before answering. Do not answer from assumption.',
      policyTrace: ['memory-intent:search'],
    }
  }

  if (
    /\bremember this\b/.test(normalized) ||
    /\bsave this\b/.test(normalized) ||
    /\bstore this\b/.test(normalized) ||
    /\bnote that\b/.test(normalized) ||
    /\bkeep in mind\b/.test(normalized) ||
    /\bfrom now on remember\b/.test(normalized) ||
    /\bmy preference is\b/.test(normalized) ||
    /\bi prefer\b/.test(normalized) ||
    /\buse .+ by default\b/.test(normalized)
  ) {
    return {
      detectedIntent: 'memory_add' as const,
      requiredActions: ['memory_add_required'] as ToolPolicyRequiredAction[],
      systemAddendum:
        'POLICY: The user explicitly asked to save durable information. You must call `memory_add` before answering unless the information is obviously transient.',
      policyTrace: ['memory-intent:add'],
    }
  }

  if (
    (/\b(forget|delete|remove|stop remembering)\b/.test(normalized) &&
      hasMemorySubjectHint(normalized)) ||
    /\bdelete that memory\b/.test(normalized) ||
    /\bremove that preference\b/.test(normalized)
  ) {
    return {
      detectedIntent: 'memory_delete' as const,
      requiredActions: ['memory_search_required'] as ToolPolicyRequiredAction[],
      systemAddendum:
        'POLICY: The user requested a memory deletion, but the target may be ambiguous. You must call `memory_search` first, then use `memory_delete` only with the returned `memoryId`.',
      policyTrace: ['memory-intent:delete', 'memory-delete:search-first'],
    }
  }

  if (
    /\bupdate your memory\b/.test(normalized) ||
    /\bchange my preference\b/.test(normalized) ||
    /\breplace what you saved\b/.test(normalized) ||
    (/\bcorrect (that|this)\b/.test(normalized) && hasMemorySubjectHint(normalized)) ||
    (/\bactually\b.*\bnot\b/.test(normalized) && hasMemorySubjectHint(normalized))
  ) {
    return {
      detectedIntent: 'memory_update' as const,
      requiredActions: ['memory_search_required'] as ToolPolicyRequiredAction[],
      systemAddendum:
        'POLICY: The user requested a memory change, but the target may be ambiguous. You must call `memory_search` first, then use `memory_update` only with the returned `memoryId`.',
      policyTrace: ['memory-intent:update', 'memory-update:search-first'],
    }
  }

  return {
    detectedIntent: 'none' as const,
    requiredActions: [] as ToolPolicyRequiredAction[],
    systemAddendum: '',
    policyTrace: ['memory-intent:none'],
  }
}

export function runThreadMetadataPolicy(args: {
  prompt: string
  currentTitle?: string
  currentEmoji?: string
  lastLabelUpdateAt: number
  firstUserMessage: string
  messageCount: number
  now?: number
}) {
  const now = args.now ?? Date.now()
  const sourceText = normalizeWhitespace(args.firstUserMessage || args.prompt)
  const titleLooksPlaceholder = isPlaceholderThreadTitle(
    args.currentTitle,
    args.firstUserMessage || args.prompt,
  )
  const stale =
    args.messageCount > AUTO_METADATA_MESSAGE_THRESHOLD &&
    now - args.lastLabelUpdateAt >= AUTO_METADATA_STALE_AFTER_MS
  const withinCooldown = now - args.lastLabelUpdateAt < AUTO_METADATA_COOLDOWN_MS
  const candidateTitle = deriveThreadTitleCandidate(sourceText)
  const candidateEmoji = deriveThreadEmojiCandidate(sourceText)
  const trace = [
    `metadata:placeholder=${titleLooksPlaceholder}`,
    `metadata:stale=${stale}`,
    `metadata:cooldown=${withinCooldown}`,
  ]

  if (!hasMeaningfulTitleCandidate(sourceText) || !candidateTitle) {
    trace.push('metadata:no-meaningful-candidate')
    return {
      detectedIntent: 'none',
      requiredActions: [],
      update: null,
      automaticActions: [],
      policyTrace: trace,
    } satisfies ThreadMetadataPolicyDecision
  }

  if (withinCooldown) {
    trace.push('metadata:cooldown-suppressed')
    return {
      detectedIntent: 'none',
      requiredActions: [],
      update: null,
      automaticActions: [],
      policyTrace: trace,
    } satisfies ThreadMetadataPolicyDecision
  }

  const normalizedCurrentTitle = normalizeLower(args.currentTitle ?? '')
  const normalizedCandidateTitle = normalizeLower(candidateTitle)
  const materiallyDifferentTitle =
    normalizedCandidateTitle.length > 0 && normalizedCandidateTitle !== normalizedCurrentTitle

  const shouldRefreshWeakStaleTitle =
    stale && isWeakThreadTitle(args.currentTitle) && materiallyDifferentTitle

  if (!titleLooksPlaceholder && !shouldRefreshWeakStaleTitle) {
    trace.push('metadata:no-update-needed')
    return {
      detectedIntent: 'none',
      requiredActions: [],
      update: null,
      automaticActions: [],
      policyTrace: trace,
    } satisfies ThreadMetadataPolicyDecision
  }

  if (!materiallyDifferentTitle && candidateEmoji === (args.currentEmoji || '💬')) {
    trace.push('metadata:no-material-change')
    return {
      detectedIntent: 'none',
      requiredActions: [],
      update: null,
      automaticActions: [],
      policyTrace: trace,
    } satisfies ThreadMetadataPolicyDecision
  }

  trace.push('metadata:update-required')

  return {
    detectedIntent: 'metadata_refresh',
    requiredActions: ['metadata_update_required'],
    update: {
      title: candidateTitle,
      emoji: candidateEmoji,
    },
    automaticActions: [],
    policyTrace: trace,
  } satisfies ThreadMetadataPolicyDecision
}

export function evaluateToolPolicy(args: {
  threadId: string
  userId: string
  prompt: string
  currentTitle?: string
  currentEmoji?: string
  lastLabelUpdateAt: number
  firstUserMessage: string
  messageCount: number
  now?: number
}) {
  const memoryIntent = detectMemoryIntent(args.prompt)
  const metadataDecision = runThreadMetadataPolicy({
    prompt: args.prompt,
    currentTitle: args.currentTitle,
    currentEmoji: args.currentEmoji,
    lastLabelUpdateAt: args.lastLabelUpdateAt,
    firstUserMessage: args.firstUserMessage,
    messageCount: args.messageCount,
    now: args.now,
  })

  const requiredActions = Array.from(
    new Set([...memoryIntent.requiredActions, ...metadataDecision.requiredActions]),
  )

  const policyTrace = [
    `thread:${args.threadId}`,
    `user:${args.userId}`,
    ...memoryIntent.policyTrace,
    ...metadataDecision.policyTrace,
  ]

  const systemAddendum = [memoryIntent.systemAddendum].filter(Boolean).join('\n')

  const detectedIntent =
    memoryIntent.detectedIntent !== 'none'
      ? memoryIntent.detectedIntent
      : metadataDecision.detectedIntent

  return {
    detectedIntent,
    requiredActions,
    systemAddendum,
    toolAvailability: {
      memoryTools: true,
      threadMetadataTool: true,
    },
    policyTrace,
  } satisfies ToolPolicyEvaluation
}

export function extractObservedTools(parts: Array<Record<string, unknown>>) {
  const seen = new Set<string>()
  const observed: string[] = []

  for (const part of parts) {
    const type = typeof part.type === 'string' ? part.type : ''
    const explicitToolName = typeof part.toolName === 'string' ? part.toolName : undefined
    const toolName =
      explicitToolName ||
      (type.startsWith('tool-') &&
      type !== 'tool-call' &&
      type !== 'tool-calls' &&
      type !== 'tool-result'
        ? type.slice(5)
        : undefined)

    if (!toolName || seen.has(toolName)) {
      continue
    }

    seen.add(toolName)
    observed.push(toolName)
  }

  return observed
}

function extractRequiredToolErrors(parts: Array<Record<string, unknown>>) {
  const failedTools = new Set<string>()

  for (const part of parts) {
    if (part.type !== 'tool-result' || part.isError !== true) {
      continue
    }

    if (typeof part.toolName === 'string') {
      failedTools.add(part.toolName)
    }
  }

  return failedTools
}

function actionToToolName(action: ToolPolicyRequiredAction) {
  switch (action) {
    case 'memory_search_required':
      return 'memory_search'
    case 'memory_add_required':
      return 'memory_add'
    case 'memory_update_required':
      return 'memory_update'
    case 'memory_delete_required':
      return 'memory_delete'
    case 'metadata_update_required':
      return 'update_thread_metadata'
  }
}

export function finalizeToolPolicyEvaluation(args: {
  requiredActions: ToolPolicyRequiredAction[]
  automaticActions: ToolPolicyAutomaticAction[]
  messageParts: Array<Record<string, unknown>>
  preflightError?: string
}) {
  const observedTools = extractObservedTools(args.messageParts)
  const observedToolSet = new Set(observedTools)
  const failedTools = extractRequiredToolErrors(args.messageParts)
  const satisfiedActions: ToolPolicyRequiredAction[] = []

  for (const action of args.requiredActions) {
    if (
      action === 'metadata_update_required' &&
      args.automaticActions.includes('metadata_update_applied')
    ) {
      satisfiedActions.push(action)
      continue
    }

    const toolName = actionToToolName(action)
    if (toolName && observedToolSet.has(toolName)) {
      satisfiedActions.push(action)
    }
  }

  if (args.preflightError) {
    return {
      observedTools,
      satisfiedActions,
      status: 'failed',
      error: args.preflightError,
    } satisfies ToolPolicyFinalization
  }

  const missingActions = args.requiredActions.filter((action) => !satisfiedActions.includes(action))
  if (missingActions.length > 0) {
    return {
      observedTools,
      satisfiedActions,
      status: 'skipped',
      error: `Required actions not satisfied: ${missingActions.join(', ')}`,
    } satisfies ToolPolicyFinalization
  }

  const failedRequiredTools = args.requiredActions
    .flatMap((action) => {
      const toolName = actionToToolName(action)
      return toolName ? [toolName] : []
    })
    .filter((toolName) => failedTools.has(toolName))

  if (failedRequiredTools.length > 0) {
    return {
      observedTools,
      satisfiedActions,
      status: 'failed',
      error: `Required tools failed: ${failedRequiredTools.join(', ')}`,
    } satisfies ToolPolicyFinalization
  }

  return {
    observedTools,
    satisfiedActions,
    status: 'completed',
  } satisfies ToolPolicyFinalization
}
