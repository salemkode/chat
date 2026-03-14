import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

export function AuthRedirect() {
  const navigate = useNavigate()
  const redirect = useRouterState({
    select: (state) =>
      `${state.location.pathname}${state.location.searchStr}${state.location.hash}`,
  })

  useEffect(() => {
    void navigate({
      to: '/login',
      search: { redirect },
      replace: true,
    })
  }, [navigate, redirect])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
