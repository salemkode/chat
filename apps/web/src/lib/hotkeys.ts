export type HotkeyActionId =
  | 'searchChats'
  | 'toggleSidebar'
  | 'newChat'
  | 'shareChat'
  | 'nextChat'
  | 'previousChat'
  | 'openSettings'

export type HotkeyBinding = string | null

export type HotkeyBindings = Record<HotkeyActionId, HotkeyBinding>
export type HotkeyPlatform = 'apple' | 'other' | 'unknown'

export type HotkeyDefinition = {
  id: HotkeyActionId
  label: string
  description: string
  defaultBinding: HotkeyBinding
  allowInInput?: boolean
}

export const HOTKEY_STORAGE_KEY = 'chat.web.hotkeys'

export const HOTKEY_DEFINITIONS: HotkeyDefinition[] = [
  {
    id: 'searchChats',
    label: 'Search chats',
    description: 'Open the chat search dialog from anywhere in the workspace.',
    defaultBinding: 'mod+k',
    allowInInput: true,
  },
  {
    id: 'toggleSidebar',
    label: 'Toggle sidebar',
    description: 'Collapse or expand the main sidebar.',
    defaultBinding: 'mod+b',
    allowInInput: true,
  },
  {
    id: 'newChat',
    label: 'New chat',
    description: 'Start a fresh chat from the current workspace.',
    defaultBinding: 'mod+shift+n',
    allowInInput: true,
  },
  {
    id: 'shareChat',
    label: 'Publish chat',
    description: 'Open the share dialog for the current chat thread.',
    defaultBinding: 'mod+shift+s',
    allowInInput: true,
  },
  {
    id: 'nextChat',
    label: 'Next chat',
    description: 'Move to the next chat in sidebar order.',
    defaultBinding: 'alt+arrowdown',
  },
  {
    id: 'previousChat',
    label: 'Previous chat',
    description: 'Move to the previous chat in sidebar order.',
    defaultBinding: 'alt+arrowup',
  },
  {
    id: 'openSettings',
    label: 'Open settings',
    description: 'Open the settings dialog.',
    defaultBinding: 'mod+,',
    allowInInput: true,
  },
]

const HOTKEY_DEFINITION_MAP = Object.fromEntries(
  HOTKEY_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Record<HotkeyActionId, HotkeyDefinition>

const MODIFIER_ORDER = ['meta', 'ctrl', 'alt', 'shift'] as const

const MODIFIER_ALIASES: Record<string, (typeof MODIFIER_ORDER)[number]> = {
  cmd: 'meta',
  command: 'meta',
  meta: 'meta',
  super: 'meta',
  control: 'ctrl',
  ctrl: 'ctrl',
  option: 'alt',
  alt: 'alt',
  shift: 'shift',
}

const KEY_ALIASES: Record<string, string> = {
  esc: 'escape',
  return: 'enter',
  down: 'arrowdown',
  up: 'arrowup',
  left: 'arrowleft',
  right: 'arrowright',
  spacebar: 'space',
}

export function getDefaultHotkeyBindings(): HotkeyBindings {
  return HOTKEY_DEFINITION_MAP
    ? HOTKEY_DEFINITIONS.reduce(
        (acc, definition) => {
          acc[definition.id] = definition.defaultBinding
          return acc
        },
        {} as HotkeyBindings,
      )
    : ({} as HotkeyBindings)
}

export function getHotkeyDefinition(actionId: HotkeyActionId) {
  return HOTKEY_DEFINITION_MAP[actionId]
}

export function normalizeHotkeyBinding(
  binding: string | null | undefined,
): HotkeyBinding {
  if (!binding) {
    return null
  }

  const tokens = binding
    .split('+')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)

  if (tokens.length === 0) {
    return null
  }

  let key: string | null = null
  let hasMod = false
  const modifiers = new Set<(typeof MODIFIER_ORDER)[number]>()

  for (const token of tokens) {
    if (token === 'mod') {
      hasMod = true
      continue
    }

    const modifier = MODIFIER_ALIASES[token]
    if (modifier) {
      modifiers.add(modifier)
      continue
    }

    key = normalizeHotkeyKey(token)
  }

  if (!key) {
    return null
  }

  const orderedModifiers = [
    ...(hasMod ? (['mod'] as const) : []),
    ...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)),
  ]
  return [...orderedModifiers, key].join('+')
}

export function normalizeHotkeyBindings(
  input: Partial<Record<HotkeyActionId, string | null | undefined>> | null,
): HotkeyBindings {
  const defaults = getDefaultHotkeyBindings()

  if (!input) {
    return defaults
  }

  const next = { ...defaults }

  for (const definition of HOTKEY_DEFINITIONS) {
    if (!(definition.id in input)) {
      continue
    }

    next[definition.id] = normalizeHotkeyBinding(input[definition.id])
  }

  return next
}

export function createHotkeyBindingFromEvent(
  event: Pick<
    KeyboardEvent,
    'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'
  >,
  platform: HotkeyPlatform = getPlatform(),
): HotkeyBinding {
  const key = normalizeEventKey(event.key)
  if (!key) {
    return null
  }

  const tokens: string[] = []
  const primaryModifier = getPrimaryModifierToken(platform)

  if (primaryModifier === 'meta' && event.metaKey) {
    tokens.push('mod')
  }
  if (primaryModifier === 'ctrl' && event.ctrlKey) {
    tokens.push('mod')
  }
  if (event.metaKey && primaryModifier !== 'meta') {
    tokens.push('meta')
  }
  if (event.ctrlKey && primaryModifier !== 'ctrl') {
    tokens.push('ctrl')
  }
  if (event.altKey) {
    tokens.push('alt')
  }
  if (event.shiftKey) {
    tokens.push('shift')
  }

  tokens.push(key)

  return normalizeHotkeyBinding(tokens.join('+'))
}

export function matchesHotkeyBinding(
  binding: HotkeyBinding,
  event: Pick<
    KeyboardEvent,
    'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'
  >,
  platform: HotkeyPlatform = getPlatform(),
): boolean {
  if (!binding) {
    return false
  }

  const pressed = createHotkeyBindingFromEvent(event, platform)
  if (!pressed) {
    return false
  }

  return binding === pressed
}

export function formatHotkeyBinding(
  binding: HotkeyBinding,
  platform: HotkeyPlatform = getPlatform(),
): string {
  if (!binding) {
    return 'Unassigned'
  }

  return binding
    .split('+')
    .map((token) => formatHotkeyToken(token, platform))
    .join('+')
}

export function getConflictingHotkeyAction(
  actionId: HotkeyActionId,
  binding: HotkeyBinding,
  bindings: HotkeyBindings,
): HotkeyActionId | null {
  if (!binding) {
    return null
  }

  for (const definition of HOTKEY_DEFINITIONS) {
    if (definition.id === actionId) {
      continue
    }

    if (bindings[definition.id] === binding) {
      return definition.id
    }
  }

  return null
}

export function shouldIgnoreHotkeyTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const tagName = target.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.closest('[contenteditable="true"]') !== null
  )
}

function normalizeHotkeyKey(key: string) {
  return KEY_ALIASES[key] ?? key
}

function normalizeEventKey(key: string) {
  const normalized = normalizeHotkeyKey(key.trim().toLowerCase())

  if (
    normalized === 'meta' ||
    normalized === 'ctrl' ||
    normalized === 'alt' ||
    normalized === 'shift'
  ) {
    return null
  }

  return normalized
}

function getPlatform(): HotkeyPlatform {
  if (typeof navigator === 'undefined') {
    return 'unknown'
  }

  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string }
  }
  const platform =
    nav.userAgentData?.platform || navigator.platform || navigator.userAgent

  return /mac|iphone|ipad|ipod/i.test(platform) ? 'apple' : 'other'
}

function formatHotkeyToken(token: string, platform: 'apple' | 'other' | 'unknown') {
  switch (token) {
    case 'meta':
      return platform === 'apple' ? 'Cmd' : 'Meta'
    case 'mod':
      return platform === 'apple' ? 'Cmd' : 'Ctrl'
    case 'ctrl':
      return 'Ctrl'
    case 'alt':
      return platform === 'apple' ? 'Option' : 'Alt'
    case 'shift':
      return 'Shift'
    case 'arrowup':
      return 'Up'
    case 'arrowdown':
      return 'Down'
    case 'arrowleft':
      return 'Left'
    case 'arrowright':
      return 'Right'
    case 'escape':
      return 'Esc'
    case 'enter':
      return 'Enter'
    case 'space':
      return 'Space'
    default:
      return token.length === 1 ? token.toUpperCase() : capitalize(token)
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getPrimaryModifierToken(platform: HotkeyPlatform) {
  return platform === 'apple' ? 'meta' : 'ctrl'
}
