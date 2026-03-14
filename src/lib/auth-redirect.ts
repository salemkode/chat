const AUTH_ROUTE_PATHS = new Set(['/login', '/signup'])

export function getPostLoginRedirectTarget(redirectUrl?: string) {
  if (!redirectUrl || redirectUrl === '/' || !redirectUrl.startsWith('/')) {
    return '/'
  }

  const pathname = redirectUrl.split('?')[0]?.split('#')[0] || '/'

  if (AUTH_ROUTE_PATHS.has(pathname)) {
    return '/'
  }

  return redirectUrl
}
