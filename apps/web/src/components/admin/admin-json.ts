export function parseJsonRecord(text: string, label: string) {
  if (!text.trim()) {
    return undefined
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error('Expected an object')
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === 'string' && value.length > 0)
        .map(([key, value]) => [key, value as string]),
    )
  } catch {
    throw new Error(`${label} must be valid JSON object text.`)
  }
}

export function getParsedJsonRecord(text: string, label: string) {
  try {
    return {
      value: parseJsonRecord(text, label),
      error: null,
    }
  } catch (error) {
    return {
      value: undefined,
      error: error instanceof Error ? error.message : `${label} must be valid JSON object text.`,
    }
  }
}

export function safeJsonStringify(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ''
  }

  return JSON.stringify(value, null, 2)
}
