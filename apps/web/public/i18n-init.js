;(function () {
  const storageKey = 'salemkode-chat-locale'
  const supportedLocales = new Set(['en', 'ar'])

  function normalizeLocale(value) {
    if (typeof value !== 'string') {
      return null
    }

    const normalized = value.trim().toLowerCase()
    if (supportedLocales.has(normalized)) {
      return normalized
    }

    const baseLocale = normalized.split('-')[0]
    return supportedLocales.has(baseLocale) ? baseLocale : null
  }

  function getResolvedLocale(preference) {
    if (preference && preference !== 'auto') {
      return normalizeLocale(preference) || 'en'
    }

    const candidates = Array.isArray(navigator.languages)
      ? navigator.languages.concat(navigator.language || [])
      : [navigator.language]

    for (const candidate of candidates) {
      const locale = normalizeLocale(candidate)
      if (locale) {
        return locale
      }
    }

    return 'en'
  }

  const preference = localStorage.getItem(storageKey) || 'auto'
  const locale = getResolvedLocale(preference)
  const direction = locale === 'ar' ? 'rtl' : 'ltr'

  document.documentElement.lang = locale
  document.documentElement.dir = direction
})()
