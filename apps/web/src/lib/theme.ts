export const THEME_STORAGE_KEY = 'theme-preference'
export const DEFAULT_CUSTOM_PRIMARY = '#8b5cf6'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export type ThemeSettings = {
  mode: ThemeMode
  primaryColor: string
}

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'system',
  primaryColor: DEFAULT_CUSTOM_PRIMARY,
}

export function parseThemeMode(
  value: unknown,
  fallback: ThemeMode = DEFAULT_THEME_SETTINGS.mode,
): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : fallback
}

export function getSystemResolvedTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function normalizeHexColor(
  value: unknown,
  fallback: string = DEFAULT_CUSTOM_PRIMARY,
): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const normalized = value.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(normalized)) {
    return `#${normalized
      .split('')
      .map((character) => `${character}${character}`)
      .join('')
      .toLowerCase()}`
  }

  if (/^[0-9a-f]{6}$/i.test(normalized)) {
    return `#${normalized.toLowerCase()}`
  }

  return fallback
}

export function parseThemeSettings(
  value: unknown,
  fallback: ThemeSettings = DEFAULT_THEME_SETTINGS,
): ThemeSettings {
  if (typeof value === 'string') {
    return parseLegacyTheme(value, fallback)
  }

  if (!isRecord(value)) {
    return fallback
  }

  return {
    mode: parseThemeMode(value.mode, fallback.mode),
    primaryColor: normalizeHexColor(value.primaryColor, fallback.primaryColor),
  }
}

export function parseStoredThemeSettings(
  value: string | null,
  fallback: ThemeSettings = DEFAULT_THEME_SETTINGS,
): ThemeSettings {
  if (!value) {
    return fallback
  }

  try {
    return parseThemeSettings(JSON.parse(value), fallback)
  } catch {
    return parseThemeSettings(value, fallback)
  }
}

export function serializeThemeSettings(settings: ThemeSettings): string {
  return JSON.stringify({
    mode: parseThemeMode(settings.mode, DEFAULT_THEME_SETTINGS.mode),
    primaryColor: normalizeHexColor(settings.primaryColor, DEFAULT_THEME_SETTINGS.primaryColor),
  })
}

export function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return getSystemResolvedTheme()
  }

  return mode
}

export function getContrastTextColor(hexColor: string): string {
  const { red, green, blue } = hexToRgb(normalizeHexColor(hexColor))
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000
  return luminance >= 160 ? '#111827' : '#f8fafc'
}

export function applyThemeSettings(root: HTMLElement, settings: ThemeSettings): ResolvedTheme {
  const normalized = {
    mode: parseThemeMode(settings.mode, DEFAULT_THEME_SETTINGS.mode),
    primaryColor: normalizeHexColor(settings.primaryColor, DEFAULT_THEME_SETTINGS.primaryColor),
  }
  const resolvedTheme = resolveThemeMode(normalized.mode)

  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
  root.dataset.themeMode = normalized.mode
  root.dataset.resolvedTheme = resolvedTheme
  root.style.colorScheme = resolvedTheme

  root.style.setProperty('--custom-primary', normalized.primaryColor)
  root.style.setProperty(
    '--custom-primary-foreground',
    getContrastTextColor(normalized.primaryColor),
  )

  return resolvedTheme
}

function parseLegacyTheme(value: string, fallback: ThemeSettings): ThemeSettings {
  if (value === 'system') {
    return {
      mode: 'system',
      primaryColor: fallback.primaryColor,
    }
  }

  if (value === 'light' || value === 'dark' || value === 'system') {
    return {
      mode: parseThemeMode(value, fallback.mode),
      primaryColor: fallback.primaryColor,
    }
  }

  if (value === 'custom') {
    return {
      mode: 'system',
      primaryColor: fallback.primaryColor,
    }
  }

  return fallback
}

function hexToRgb(value: string) {
  const normalized = normalizeHexColor(value).slice(1)
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
