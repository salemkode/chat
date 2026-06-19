import { describe, expect, it } from 'vitest'
import { resolveChatSnapshot } from '../cache/resolve-snapshot'

describe('resolveChatSnapshot', () => {
  it('returns persisted when live is undefined', () => {
    expect(
      resolveChatSnapshot({
        live: undefined,
        persisted: [{ id: '1' }],
      }),
    ).toEqual([{ id: '1' }])
  })

  it('returns persisted when live is empty but cache has data', () => {
    expect(
      resolveChatSnapshot({
        live: [],
        persisted: [{ id: '1' }],
      }),
    ).toEqual([{ id: '1' }])
  })

  it('returns live when live has data', () => {
    expect(
      resolveChatSnapshot({
        live: [{ id: '2' }],
        persisted: [{ id: '1' }],
      }),
    ).toEqual([{ id: '2' }])
  })

  it('returns empty when live is empty and no cache', () => {
    expect(
      resolveChatSnapshot({
        live: [],
        persisted: [],
      }),
    ).toEqual([])
  })
})
