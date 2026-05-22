function stripNullishNameParts(name: string): string {
  return name
    .replace(/\bnull\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function emailLocalPart(email: string | undefined): string | undefined {
  const local = email?.split('@')[0]?.trim()
  return local && local.length > 0 ? local : undefined
}

/** Client-side display name: never surfaces literal "null" from Clerk sync. */
export function resolveViewerDisplayName({
  displayName,
  fallbackName,
  email,
}: {
  displayName?: string | null
  fallbackName?: string | null
  email?: string | null
}): string {
  const candidate = stripNullishNameParts(
    displayName?.trim() || fallbackName?.trim() || '',
  )
  if (candidate) {
    return candidate
  }
  return emailLocalPart(email ?? undefined) ?? 'User'
}

/** Server-side Clerk name formatting for new user records. */
export function formatClerkDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email?: string,
): string {
  const parts = [firstName, lastName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part.length > 0 && part.toLowerCase() !== 'null')

  const joined = parts.join(' ').trim()
  if (joined) {
    return joined
  }

  return emailLocalPart(email) ?? 'User'
}
