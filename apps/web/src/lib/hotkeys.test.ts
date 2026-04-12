import { describe, expect, it } from 'vitest'
import {
  createHotkeyBindingFromEvent,
  formatHotkeyBinding,
  getConflictingHotkeyAction,
  getDefaultHotkeyBindings,
  matchesHotkeyBinding,
  normalizeHotkeyBinding,
} from './hotkeys'

describe('hotkeys helpers', () => {
  it('keeps mod bindings normalized for cross-platform defaults', () => {
    expect(normalizeHotkeyBinding(' Mod + Shift + K ')).toBe('mod+shift+k')
    expect(formatHotkeyBinding('mod+k', 'other')).toBe('Ctrl+K')
  })

  it('matches mod bindings against ctrl or meta key events', () => {
    expect(
      matchesHotkeyBinding('mod+k', {
        altKey: false,
        ctrlKey: true,
        key: 'k',
        metaKey: false,
        shiftKey: false,
      }, 'other'),
    ).toBe(true)

    expect(
      matchesHotkeyBinding('mod+k', {
        altKey: false,
        ctrlKey: false,
        key: 'k',
        metaKey: true,
        shiftKey: false,
      }, 'apple'),
    ).toBe(true)

    expect(
      matchesHotkeyBinding('mod+k', {
        altKey: false,
        ctrlKey: true,
        key: 'k',
        metaKey: false,
        shiftKey: false,
      }, 'apple'),
    ).toBe(false)
  })

  it('creates bindings from keyboard events and detects conflicts', () => {
    const binding = createHotkeyBindingFromEvent({
      altKey: true,
      ctrlKey: false,
      key: 'ArrowDown',
      metaKey: false,
      shiftKey: false,
    }, 'other')

    expect(binding).toBe('alt+arrowdown')

    expect(
      createHotkeyBindingFromEvent({
        altKey: false,
        ctrlKey: false,
        key: 's',
        metaKey: true,
        shiftKey: true,
      }, 'apple'),
    ).toBe('mod+shift+s')

    const bindings = getDefaultHotkeyBindings()
    expect(getConflictingHotkeyAction('previousChat', binding, bindings)).toBe(
      'nextChat',
    )
  })
})
