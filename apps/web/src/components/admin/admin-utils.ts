import type { DashboardData } from '@/components/admin/types'

export const usageChartConfig = {
  requests: {
    label: 'Requests',
    color: 'hsl(var(--chart-1))',
  },
  tokens: {
    label: 'Tokens',
    color: 'hsl(var(--chart-2))',
  },
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
}

export function formatDateTime(value?: number) {
  if (!value) {
    return 'Never'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value)
}

export function formatTokenCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatModelModalities(modalities?: { input?: string[]; output?: string[] }) {
  const values = [...(modalities?.input ?? []), ...(modalities?.output ?? [])].filter(Boolean)

  return values.length > 0 ? values.join(', ') : 'n/a'
}

export function getCapabilitiesTextFromModalities(modalities?: {
  input?: string[]
  output?: string[]
}) {
  const capabilities = [...(modalities?.input ?? []), ...(modalities?.output ?? [])]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0 && value !== 'text')

  return [...new Set(capabilities)].join(', ')
}

export function getProviderName(
  providers: DashboardData['providers'] | undefined,
  providerId: string,
) {
  return (
    providers?.find((provider: DashboardData['providers'][number]) => provider._id === providerId)
      ?.name ?? 'Unknown Provider'
  )
}
