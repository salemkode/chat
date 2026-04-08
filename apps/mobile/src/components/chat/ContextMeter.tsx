import { useQuery } from 'convex/react'
import { Text, View } from 'react-native'
import { api, type Id } from '../../lib/convexApi'
import { CHAT_FG_MUTED } from './constants'

function formatContextTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function ContextMeter({
  threadId,
  modelDocId,
}: {
  threadId?: string
  modelDocId?: Id<'models'>
}) {
  const data = useQuery(
    api.agents.getThreadContextMeter,
    threadId && modelDocId
      ? { threadId, selectedModelId: modelDocId }
      : 'skip',
  )

  if (!threadId || !modelDocId) {
    return null
  }
  if (data === undefined) {
    return null
  }
  if (data.contextWindow === null && !data.hasUsage) {
    return null
  }

  const limit = data.contextWindow
  const used = data.usedPromptTokens
  const pct =
    limit !== null && used !== null && limit > 0
      ? Math.min(100, Math.round((used / limit) * 100))
      : null

  const labelRight =
    used !== null && limit !== null
      ? `${formatContextTokens(used)} / ${formatContextTokens(limit)}`
      : limit !== null
        ? data.modelMatches
          ? '—'
          : 'Different model last turn'
        : '—'

  return (
    <View style={{ marginBottom: 8, width: '100%' }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <Text style={{ fontSize: 11, color: CHAT_FG_MUTED, fontFamily: 'Inter_400Regular' }}>
          Context
        </Text>
        <Text style={{ fontSize: 11, color: CHAT_FG_MUTED, fontFamily: 'Inter_400Regular' }}>
          {labelRight}
        </Text>
      </View>
      {limit !== null && used !== null ? (
        <View
          style={{
            height: 3,
            borderRadius: 999,
            backgroundColor: 'rgba(148,163,184,0.35)',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${pct ?? 0}%`,
              borderRadius: 999,
              backgroundColor: '#4a9cff',
            }}
          />
        </View>
      ) : null}
    </View>
  )
}
