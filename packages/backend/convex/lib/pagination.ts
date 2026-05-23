export function paginateResults<T>(
  items: T[],
  args: {
    cursor?: string | null
    numItems?: number
  },
) {
  const limit = Math.max(1, Math.min(args.numItems ?? 50, 200))
  const offset = Number(args.cursor ?? '0')
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0
  const page = items.slice(safeOffset, safeOffset + limit)
  const nextOffset = safeOffset + page.length

  return {
    page,
    isDone: nextOffset >= items.length,
    continueCursor: nextOffset >= items.length ? '' : String(nextOffset),
  }
}
