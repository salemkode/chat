import { RedirectToSignIn } from '@clerk/clerk-react'
import { useRouterState } from '@tanstack/react-router'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export function AuthRedirect() {
  const redirect = useRouterState({
    select: (state) =>
      getPostLoginRedirectTarget(
        `${state.location.pathname}${state.location.searchStr}${state.location.hash}`,
      ),
  })

  return <RedirectToSignIn redirectUrl={redirect} />
}
