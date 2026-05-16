import { useNavigate } from 'react-router'
import { Loader2 } from '@/lib/icons'
import { useEffect } from 'react'
import { queueSettingsTabIntent } from '@/lib/settings-navigation'

export default function MemoryRedirectPage() {
  const navigate = useNavigate()

  useEffect(() => {
    queueSettingsTabIntent('memory')
    void navigate('/', { replace: true })
  }, [navigate])

  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <Loader2 className="size-8 animate-spin" />
    </div>
  )
}
