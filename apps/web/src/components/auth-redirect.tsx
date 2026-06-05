import { Navigate, useLocation } from 'react-router'
import { buildAuthUrl, getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export function AuthRedirect() {
  const location = useLocation()
  const redirect = getPostLoginRedirectTarget(
    `${location.pathname}${location.search}${location.hash}`,
  )

  const redirect_url =
    typeof window !== 'undefined' ? `${window.location.origin}${redirect}` : undefined

  return <Navigate to={buildAuthUrl({ redirectTarget: redirect, redirectUrl: redirect_url })} replace />
}
