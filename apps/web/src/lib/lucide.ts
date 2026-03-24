import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type LucideModule = Record<string, unknown>

const lucideModule = LucideIcons as LucideModule

export function getLucideIcon(name: string): LucideIcon | undefined {
  const value = lucideModule[name]
  return isLucideIcon(value) ? value : undefined
}

export const lucideIconNames = Object.entries(lucideModule)
  .filter(([name, value]) => /^[A-Z]/.test(name) && isLucideIcon(value))
  .map(([name]) => name)
  .sort((left, right) => left.localeCompare(right))

function isLucideIcon(value: unknown): value is LucideIcon {
  if (typeof value === 'function') {
    return true
  }

  return Boolean(
    value &&
      typeof value === 'object' &&
      'render' in value &&
      typeof value.render === 'function',
  )
}
