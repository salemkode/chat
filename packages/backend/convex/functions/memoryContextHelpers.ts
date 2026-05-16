export type MemoryContextHit = {
  contentHash: string
}

export function dedupeMemoryHitsByPriority<T extends MemoryContextHit>(groups: T[][]) {
  const seenContentHashes = new Set<string>()

  return groups.map((group) =>
    group.filter((hit) => {
      if (seenContentHashes.has(hit.contentHash)) {
        return false
      }
      seenContentHashes.add(hit.contentHash)
      return true
    }),
  )
}
