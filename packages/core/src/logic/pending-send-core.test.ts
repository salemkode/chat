import { describe, expect, it } from 'vitest'
import { attachmentsMatchForHandoff, hasLiveHandoffMatch } from './pending-send-core'

describe('pending-send-core', () => {
  it('treats empty live file parts as compatible when pending has attachments', () => {
    expect(attachmentsMatchForHandoff([{ filename: 'a.png', mediaType: 'image/png' }], [])).toBe(true)
  })

  it('detects live handoff when user text matches and assistant is streaming', () => {
    const live = [
      { role: 'user', text: 'hello', parts: [{ type: 'text', text: 'hello' }] },
      { role: 'assistant', text: '', status: 'streaming', parts: [] },
    ]
    expect(hasLiveHandoffMatch('hello', [], live)).toBe(true)
  })

  it('hands off when newest user matches even without an assistant row yet (optimistic user-only)', () => {
    const live = [{ role: 'user', text: 'hello', parts: [{ type: 'text', text: 'hello' }] }]
    expect(hasLiveHandoffMatch('hello', [], live)).toBe(true)
  })

  it('does not use an older user when the newest user differs', () => {
    const live = [
      { role: 'user', text: 'first', parts: [] },
      { role: 'assistant', text: 'ok', status: 'success', parts: [] },
      { role: 'user', text: 'second', parts: [] },
    ]
    expect(hasLiveHandoffMatch('first', [], live)).toBe(false)
  })
})
