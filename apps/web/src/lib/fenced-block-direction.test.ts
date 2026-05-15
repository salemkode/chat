import { describe, expect, it } from 'vitest'
import { getFencedBlockDirection } from './fenced-block-direction'

describe('getFencedBlockDirection', () => {
  it('returns ltr for empty text', () => {
    expect(getFencedBlockDirection('')).toBe('ltr')
  })

  it('returns ltr for whitespace-only text', () => {
    expect(getFencedBlockDirection('   \n\t  ')).toBe('ltr')
  })

  it('returns ltr for pure English / code-like Latin content', () => {
    expect(getFencedBlockDirection('const x = 1')).toBe('ltr')
    expect(getFencedBlockDirection('hello')).toBe('ltr')
  })

  it('returns rtl for pure Arabic prose', () => {
    expect(getFencedBlockDirection('السلام عليكم')).toBe('rtl')
  })

  it('returns ltr when Arabic and English are mixed', () => {
    expect(getFencedBlockDirection('hello مرحبا')).toBe('ltr')
    expect(getFencedBlockDirection('مرحبا world')).toBe('ltr')
  })

  it('returns rtl for Arabic with digits and punctuation only', () => {
    expect(getFencedBlockDirection('123 — السلام!')).toBe('rtl')
    expect(getFencedBlockDirection('١٢٣ العربية')).toBe('rtl')
  })

  it('returns ltr for digits and punctuation without letters', () => {
    expect(getFencedBlockDirection('123 === 456')).toBe('ltr')
    expect(getFencedBlockDirection('!!!')).toBe('ltr')
  })

  it('returns ltr for code with Arabic in comments or strings alongside Latin syntax', () => {
    expect(
      getFencedBlockDirection('const s = "مرحبا"; // Arabic string\nconsole.log(s)'),
    ).toBe('ltr')
  })

  it('returns ltr for Hebrew (narrower than generic RTL detection)', () => {
    expect(getFencedBlockDirection('שלום')).toBe('ltr')
  })

  it('returns ltr for Cyrillic', () => {
    expect(getFencedBlockDirection('Привет')).toBe('ltr')
  })
})
