'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  applyThemeSettings,
  DEFAULT_THEME_SETTINGS,
  normalizeHexColor,
  parseStoredThemeSettings,
  serializeThemeSettings,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeMode,
  type ThemeSettings,
} from '@/lib/theme'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  resolvedTheme: ResolvedTheme
  primaryColor: string
  setPrimaryColor: (color: string) => void
  themeSettings: ThemeSettings
  setThemeSettings: React.Dispatch<React.SetStateAction<ThemeSettings>>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME_SETTINGS,
  storageKey = THEME_STORAGE_KEY,
}: {
  children: React.ReactNode
  defaultTheme?: ThemeSettings
  storageKey?: string
}) {
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => {
    if (typeof window === 'undefined') {
      return defaultTheme
    }

    return parseStoredThemeSettings(localStorage.getItem(storageKey), defaultTheme)
  })
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark')

  useEffect(() => {
    const resolved = applyThemeSettings(
      window.document.documentElement,
      themeSettings,
    )
    setResolvedTheme(resolved)
    localStorage.setItem(storageKey, serializeThemeSettings(themeSettings))
  }, [storageKey, themeSettings])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      setResolvedTheme(
        applyThemeSettings(window.document.documentElement, themeSettings),
      )
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [themeSettings])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) {
        return
      }

      setThemeSettings(parseStoredThemeSettings(event.newValue, defaultTheme))
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [defaultTheme, storageKey])

  const theme = themeSettings.mode

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeSettings((current) => ({ ...current, mode: nextTheme }))
  }

  const setPrimaryColor = (color: string) => {
    setThemeSettings((current) => ({
      ...current,
      primaryColor: normalizeHexColor(color, current.primaryColor),
    }))
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
        primaryColor: themeSettings.primaryColor,
        setPrimaryColor,
        themeSettings,
        setThemeSettings,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
