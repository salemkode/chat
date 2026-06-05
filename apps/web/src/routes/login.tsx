import { Navigate, useSearchParams } from 'react-router'
import { buildAuthUrl, getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? undefined
  const redirectUrl = searchParams.get('redirect_url') ?? undefined
  const redirectTarget = getPostLoginRedirectTarget(redirect)

  return <Navigate to={buildAuthUrl({ redirectTarget, redirectUrl })} replace />
}
