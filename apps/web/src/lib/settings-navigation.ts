export type SettingsTab =
  | 'general'
  | 'keyboard'
  | 'theme'
  | 'model'
  | 'memory'
  | 'data'
  | 'account'
  | 'admin'

const SETTINGS_TAB_INTENT_KEY = 'chat.settings.intent'

const VALID_TABS = new Set<SettingsTab>([
  'general',
  'keyboard',
  'theme',
  'model',
  'memory',
  'data',
  'account',
  'admin',
])

export function queueSettingsTabIntent(tab: SettingsTab) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(SETTINGS_TAB_INTENT_KEY, tab)
}

export function consumeSettingsTabIntent(): SettingsTab | null {
  if (typeof window === 'undefined') {
    return null
  }

  const tab = window.sessionStorage.getItem(SETTINGS_TAB_INTENT_KEY)
  window.sessionStorage.removeItem(SETTINGS_TAB_INTENT_KEY)

  if (!tab || !VALID_TABS.has(tab as SettingsTab)) {
    return null
  }

  return tab as SettingsTab
}
