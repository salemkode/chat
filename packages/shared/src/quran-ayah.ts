type UnknownRecord = Record<string, unknown>

export type QuranAyahCardData = {
  verseKey?: string
  arabic: string
  audioUrl?: string
  sourceUrl?: string
}

export function getQuranAyahCardFromParts(
  parts: Array<Record<string, unknown>> | null | undefined,
): QuranAyahCardData | null {
  if (!Array.isArray(parts) || parts.length === 0) {
    return null
  }

  for (const rawPart of parts) {
    const part = asRecord(rawPart)
    if (!part) {
      continue
    }

    const partType = getString(part.type)
    const toolName = getString(part.toolName)

    if (partType === 'tool-result' && toolName === 'quran_source_lookup') {
      const toolResult = extractQuranAyahCardFromToolResult(part)
      if (toolResult) {
        return toolResult
      }
    }

    if (
      partType === 'quran-ayah' ||
      partType === 'ayah' ||
      partType === 'data-quran-ayah'
    ) {
      const customPart = extractQuranAyahCard(part)
      if (customPart) {
        return customPart
      }
    }
  }

  return null
}

function extractQuranAyahCardFromToolResult(part: UnknownRecord) {
  const result = extractQuranAyahCard(part.result)
  if (result) {
    return result
  }

  const output = asRecord(part.output)
  if (!output) {
    return null
  }

  if (getString(output.type) === 'json') {
    return extractQuranAyahCard(output.value)
  }

  return null
}

function extractQuranAyahCard(value: unknown): QuranAyahCardData | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }

  const nestedCard = extractNestedAyahCard(record.ayahCard)
  if (nestedCard) {
    return nestedCard
  }

  if ('ok' in record && record.ok !== true) {
    return null
  }

  const arabic =
    getString(record.arabic) ||
    getString(record.ayah) ||
    getString(record.text_uthmani) ||
    getString(record.textArabic)
  if (!arabic) {
    return null
  }

  const verseKey = getString(record.verseKey) || getString(record.verse_key)
  const sourceUrl =
    getString(record.sourceUrl) ||
    getString(record.source_url) ||
    getResultUrl(record.results)
  const audioUrl = getAudioUrl(record)

  return {
    verseKey,
    arabic,
    ...(audioUrl ? { audioUrl } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
  }
}

function extractNestedAyahCard(value: unknown): QuranAyahCardData | null {
  const record = asRecord(value)
  if (!record) {
    return null
  }

  const arabic = getString(record.arabic) || getString(record.ayah)
  if (!arabic) {
    return null
  }

  return {
    arabic,
    ...(getString(record.verseKey) || getString(record.verse_key)
      ? { verseKey: getString(record.verseKey) || getString(record.verse_key) }
      : {}),
    ...(getString(record.audioUrl) || getString(record.audio_url)
      ? { audioUrl: getString(record.audioUrl) || getString(record.audio_url) }
      : {}),
    ...(getString(record.sourceUrl) || getString(record.source_url)
      ? { sourceUrl: getString(record.sourceUrl) || getString(record.source_url) }
      : {}),
  }
}

function getAudioUrl(record: UnknownRecord) {
  const directAudioUrl =
    getString(record.audioUrl) ||
    getString(record.audio_url) ||
    getString(record.audioURL)
  if (directAudioUrl) {
    return directAudioUrl
  }

  const directAudio = getString(record.audio)
  if (directAudio) {
    return directAudio
  }

  const nestedAudio =
    getNestedUrl(record.audio) ||
    getNestedUrl(record.recitation) ||
    getNestedUrl(record.recitationAudio) ||
    getNestedUrl(record.audioFile)
  if (nestedAudio) {
    return nestedAudio
  }

  const urls =
    getFirstStringFromArray(record.audioUrls) ||
    getFirstStringFromArray(record.audio_urls)
  if (urls) {
    return urls
  }

  return undefined
}

function getNestedUrl(value: unknown) {
  const record = asRecord(value)
  if (!record) {
    return undefined
  }

  return (
    getString(record.url) ||
    getString(record.src) ||
    getString(record.audioUrl) ||
    getString(record.audio_url)
  )
}

function getResultUrl(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }

  for (const item of value) {
    const record = asRecord(item)
    const url = record ? getString(record.url) : undefined
    if (url) {
      return url
    }
  }

  return undefined
}

function getFirstStringFromArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }

  for (const item of value) {
    const stringValue = getString(item)
    if (stringValue) {
      return stringValue
    }
  }

  return undefined
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined
}
