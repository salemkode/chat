import { useSearchParams } from 'react-router'
import { CustomAuthPage } from '@/components/auth/custom-auth-page'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const redirect =
    searchParams.get('redirect') ?? searchParams.get('redirect_url') ?? undefined
  const redirectTarget = getPostLoginRedirectTarget(redirect)

  return <CustomAuthPage redirectTarget={redirectTarget} />
}
