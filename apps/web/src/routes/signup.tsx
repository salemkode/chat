import { useSearchParams } from 'react-router'
import { CustomAuthPage } from '@/components/auth/custom-auth-page'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export default function SignupPage() {
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? searchParams.get('redirect_url') ?? undefined
  const targetAfterSignup = getPostLoginRedirectTarget(redirect)

  return <CustomAuthPage mode="signup" redirectTarget={targetAfterSignup} />
}
