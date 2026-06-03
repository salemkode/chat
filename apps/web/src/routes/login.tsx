import { useSearchParams } from 'react-router'
import { CustomAuthPage } from '@/components/auth/custom-auth-page'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? undefined
  const targetAfterLogin = getPostLoginRedirectTarget(redirect)

  return <CustomAuthPage mode="login" redirectTarget={targetAfterLogin} />
}
