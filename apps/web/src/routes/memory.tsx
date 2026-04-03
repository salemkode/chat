import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from '@/lib/icons'
import { useEffect } from 'react'
import { queueSettingsTabIntent } from '@/lib/settings-navigation'

export const Route = createFileRoute('/memory')({
  ssr: false,
  component: MemoryRedirectPage,
})

function MemoryRedirectPage() {
  const navigate = useNavigate()

  useEffect(() => {
    queueSettingsTabIntent('memory')
    void navigate({ to: '/', replace: true })
  }, [navigate])

  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <Loader2 className="size-8 animate-spin" />
    </div>
  )
}
