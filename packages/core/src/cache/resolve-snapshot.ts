/**
 * Unified snapshot resolution: distinguish loading (`undefined`) from loaded empty (`[]`).
 */

export type ResolveSnapshotArgs<T> = {
  live: T[] | undefined
  persisted?: T[] | null
  inFlight?: T[]
  merge?: (args: { live: T[]; persisted: T[]; inFlight: T[] }) => T[]
}

export function resolveChatSnapshot<T>({
  live,
  persisted = [],
  inFlight = [],
  merge,
}: ResolveSnapshotArgs<T>): T[] {
  const cached = persisted ?? []
  const flying = inFlight ?? []

  if (live === undefined) {
    if (merge) {
      return merge({ live: [], persisted: cached, inFlight: flying })
    }
    return [...cached, ...flying]
  }

  if (live.length === 0 && (cached.length > 0 || flying.length > 0)) {
    if (merge) {
      return merge({ live: [], persisted: cached, inFlight: flying })
    }
    return [...cached, ...flying]
  }

  if (merge) {
    return merge({ live, persisted: cached, inFlight: flying })
  }

  return live.length > 0 ? live : cached
}

export function isQueryLoading<T>(live: T[] | undefined): boolean {
  return live === undefined
}
