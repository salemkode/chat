import { Navigate, useRouterState } from '@tanstack/react-router'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export function AuthRedirect() {
  const redirect = useRouterState({
    select: (state) =>
      getPostLoginRedirectTarget(
        `${state.location.pathname}${state.location.searchStr}${state.location.hash}`,
      ),
  })

  const redirect_url =
    typeof window !== 'undefined'
      ? `${window.location.origin}${redirect}`
      : undefined

  return (
    <Navigate
      to="/login"
      search={{ redirect, redirect_url }}
      replace
    />
  )
}
