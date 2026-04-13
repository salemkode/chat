;(function () {
  const STORAGE_KEY = 'theme-preference'
  const DEFAULT_PRIMARY = '#8b5cf6'
  const root = document.documentElement
  const storedValue = localStorage.getItem(STORAGE_KEY)

  function normalizeHexColor(value, fallback) {
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

  function getContrastTextColor(hexColor) {
    const normalized = normalizeHexColor(hexColor, DEFAULT_PRIMARY).slice(1)
    const red = Number.parseInt(normalized.slice(0, 2), 16)
    const green = Number.parseInt(normalized.slice(2, 4), 16)
    const blue = Number.parseInt(normalized.slice(4, 6), 16)
    const luminance = (red * 299 + green * 587 + blue * 114) / 1000
    return luminance >= 160 ? '#111827' : '#f8fafc'
  }

  function parseThemeSettings(value) {
    if (!value) {
      return { mode: 'system', primaryColor: DEFAULT_PRIMARY }
    }

    if (value === 'system') {
      return {
        mode: 'system',
        primaryColor: DEFAULT_PRIMARY,
      }
    }

    if (value === 'light' || value === 'dark' || value === 'system') {
      return { mode: value, primaryColor: DEFAULT_PRIMARY }
    }

    if (value === 'custom') {
      return { mode: 'system', primaryColor: DEFAULT_PRIMARY }
    }

    try {
      const parsed = JSON.parse(value)
      const mode =
        parsed && (parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'system')
          ? parsed.mode
          : parsed && parsed.mode === 'custom'
            ? 'system'
            : 'system'

      return {
        mode,
        primaryColor: normalizeHexColor(parsed && parsed.primaryColor, DEFAULT_PRIMARY),
      }
    } catch {
      return { mode: 'system', primaryColor: DEFAULT_PRIMARY }
    }
  }

  const settings = parseThemeSettings(storedValue)
  const resolved =
    settings.mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : settings.mode

  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.dataset.themeMode = settings.mode
  root.dataset.resolvedTheme = resolved
  root.style.colorScheme = resolved

  root.style.setProperty('--custom-primary', settings.primaryColor)
  root.style.setProperty('--custom-primary-foreground', getContrastTextColor(settings.primaryColor))
})()
