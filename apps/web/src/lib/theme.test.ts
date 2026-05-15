import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME_SETTINGS,
  getArabicFontFamily,
  parseArabicFont,
  parseStoredThemeSettings,
} from '@/lib/theme'

describe('theme font helpers', () => {
  it('defaults Arabic text to IBM Plex Sans Arabic', () => {
    expect(DEFAULT_THEME_SETTINGS.arabicFont).toBe('ibm-plex-arabic')
  })

  it('migrates legacy Thmanyah values to IBM Plex Sans Arabic', () => {
    expect(parseArabicFont('thmanyah')).toBe('ibm-plex-arabic')

    const stored = parseStoredThemeSettings(JSON.stringify({ arabicFont: 'thmanyah' }))
    expect(stored.arabicFont).toBe('ibm-plex-arabic')
  })

  it('returns an IBM Arabic font stack', () => {
    expect(getArabicFontFamily('ibm-plex-arabic')).toContain('IBM Plex Sans Arabic')
  })
})
