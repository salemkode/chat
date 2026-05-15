import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  defaultLocale,
  defaultLocalePreference,
  getDocumentLocale,
  getLocaleDirection,
  localeStorageKey,
  normalizeLocalePreference,
  resolveLocale,
  supportedLocales,
  translate,
  type Direction,
  type Locale,
  type LocalePreference,
  type TranslationKey,
} from '@chat/shared/logic/i18n'

type I18nContextValue = {
  locale: Locale
  direction: Direction
  localePreference: LocalePreference
  setLocalePreference: (preference: LocalePreference) => void
  supportedLocales: readonly Locale[]
  t: (key: TranslationKey, values?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function readStoredLocalePreference(): LocalePreference {
  if (typeof window === 'undefined') {
    return defaultLocalePreference
  }

  return normalizeLocalePreference(window.localStorage.getItem(localeStorageKey))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [localePreference, setLocalePreferenceState] = useState<LocalePreference>(
    readStoredLocalePreference,
  )

  const locale = useMemo(
    () => (typeof window === 'undefined' ? getDocumentLocale() : resolveLocale(localePreference)),
    [localePreference],
  )
  const direction = useMemo(() => getLocaleDirection(locale), [locale])

  const setLocalePreference = useCallback((preference: LocalePreference) => {
    setLocalePreferenceState(preference)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(localeStorageKey, preference)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = direction
    document.title = translate(locale, 'app.title')
    const description = document.querySelector('meta[name="description"]')
    if (description) {
      description.setAttribute('content', translate(locale, 'app.description'))
    }
  }, [direction, locale])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== localeStorageKey) {
        return
      }

      setLocalePreferenceState(normalizeLocalePreference(event.newValue))
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      direction,
      localePreference,
      setLocalePreference,
      supportedLocales,
      t: (key, values) => translate(locale, key, values),
    }),
    [direction, locale, localePreference, setLocalePreference],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }

  return context
}

export function useDocumentDirection() {
  const context = useContext(I18nContext)
  return context?.direction ?? getLocaleDirection(defaultLocale)
}
