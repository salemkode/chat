import { Navigate, useSearchParams } from 'react-router'
import { buildAuthUrl, getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export default function SignupPage() {
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? searchParams.get('redirect_url') ?? undefined
  const redirectUrl = searchParams.get('redirect_url') ?? undefined
  const redirectTarget = getPostLoginRedirectTarget(redirect)

  return <Navigate to={buildAuthUrl({ redirectTarget, redirectUrl })} replace />
}
