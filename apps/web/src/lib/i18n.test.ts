import { describe, expect, it } from 'vitest'
import {
  getLocaleDirection,
  normalizeLocale,
  normalizeLocalePreference,
  translate,
} from '@/lib/i18n'

describe('i18n helpers', () => {
  it('normalizes supported locales and locale tags', () => {
    expect(normalizeLocale('ar')).toBe('ar')
    expect(normalizeLocale('en-US')).toBe('en')
    expect(normalizeLocale('fr')).toBeNull()
  })

  it('normalizes locale preferences with auto fallback', () => {
    expect(normalizeLocalePreference('auto')).toBe('auto')
    expect(normalizeLocalePreference('ar-SA')).toBe('ar')
    expect(normalizeLocalePreference('unknown')).toBe('auto')
  })

  it('returns direction by locale', () => {
    expect(getLocaleDirection('en')).toBe('ltr')
    expect(getLocaleDirection('ar')).toBe('rtl')
  })

  it('interpolates translation values', () => {
    expect(translate('en', 'sidebar.searchInProject', { projectName: 'Alpha' })).toBe('in Alpha')
    expect(translate('ar', 'share.snapshotWithCount', { count: 4 })).toContain('4')
  })
})
