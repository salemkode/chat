import type { GenericId } from 'convex/values'

/**
 * Convex document IDs are URL-safe strings (see `GenericId` / `Id` in `convex/values`).
 * This module helps avoid scattering unchecked `as Id<...>` casts when you only
 * have untrusted text (routes, query params, storage).
 *
 * **Authoritative validation (table + format)** belongs on the Convex side:
 * - `ctx.db.normalizeId("tableName", idString)` in queries/mutations/actions
 * - `v.id("tableName")` on function `args`
 *
 * Client-side checks here only reject obviously invalid strings before passing
 * them into Convex; they do **not** prove a row exists or that the ID is for
 * the right table at the encoding level (use `normalizeId` server-side for that).
 */

const MAX_LEN = 128

/**
 * Rejects empty, oversize, or strings with characters Convex IDs do not use.
 * Intentionally conservative; invalid IDs should still fail `v.id` / `normalizeId`.
 */
export function isPossiblyConvexDocumentId(value: string): boolean {
  if (value.length === 0 || value.length > MAX_LEN) {
    return false
  }
  return /^[a-z0-9]+$/i.test(value)
}

/**
 * If `value` passes {@link isPossiblyConvexDocumentId}, returns it branded as
 * `GenericId<Table>`. Otherwise `undefined`.
 *
 * Use for optional IDs from URLs or external text. For required IDs, treat
 * `undefined` as “bad input” and redirect or show an error.
 */
export function parseConvexIdForTable<Table extends string>(
  _table: Table,
  value: string | undefined | null,
): GenericId<Table> | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  const trimmed = value.trim()
  if (!isPossiblyConvexDocumentId(trimmed)) {
    return undefined
  }
  return trimmed as GenericId<Table>
}
