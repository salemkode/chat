import { useSearchParams } from 'react-router'
import { CustomAuthPage } from '@/components/auth/custom-auth-page'
import { getAuthMode, getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const mode = getAuthMode(searchParams.get('mode'))
  const redirect =
    searchParams.get('redirect') ?? searchParams.get('redirect_url') ?? undefined
  const redirectTarget = getPostLoginRedirectTarget(redirect)

  return <CustomAuthPage mode={mode} redirectTarget={redirectTarget} />
}
