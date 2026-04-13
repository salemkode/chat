import { Navigate, useLocation } from 'react-router'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export function AuthRedirect() {
  const location = useLocation()
  const redirect = getPostLoginRedirectTarget(
    `${location.pathname}${location.search}${location.hash}`,
  )

  const redirect_url =
    typeof window !== 'undefined' ? `${window.location.origin}${redirect}` : undefined

  const searchParams = new URLSearchParams()
  searchParams.set('redirect', redirect)
  if (redirect_url) {
    searchParams.set('redirect_url', redirect_url)
  }

  return <Navigate to={`/login?${searchParams.toString()}`} replace />
}
