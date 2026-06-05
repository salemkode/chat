export const AUTH_ROUTE_PATH = '/auth'
export const AUTH_SIGN_UP_URL = AUTH_ROUTE_PATH
const AUTH_ROUTE_PATHS = new Set([AUTH_ROUTE_PATH, '/login', '/signup'])

export function buildAuthUrl({
  redirectTarget,
  redirectUrl,
}: {
  redirectTarget?: string
  redirectUrl?: string
} = {}) {
  const searchParams = new URLSearchParams()

  if (redirectTarget && redirectTarget !== '/') {
    searchParams.set('redirect', redirectTarget)
  }

  if (redirectUrl) {
    searchParams.set('redirect_url', redirectUrl)
  }

  const search = searchParams.toString()
  return search ? `${AUTH_ROUTE_PATH}?${search}` : AUTH_ROUTE_PATH
}

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
