'use client'

import { CloudOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOfflineStatus, useSyncController } from '@/offline/repositories'

export function OfflineBanner() {
  const { isOnline, lastSyncAt, syncError, isSyncing } = useOfflineStatus()
  const { syncNow } = useSyncController()

  if (isOnline && !syncError) {
    return null
  }

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-100">
      <div className="container flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CloudOff className="size-4" />
          <span>
            {isOnline
              ? syncError || 'Sync issue detected.'
              : `Offline mode. Cached chats remain available${lastSyncAt ? `, last synced ${new Date(lastSyncAt).toLocaleString()}` : ''}.`}
          </span>
        </div>
        {isOnline && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => void syncNow()}
            disabled={isSyncing}
          >
            <RefreshCw className="mr-2 size-3.5" />
            {isSyncing ? 'Syncing...' : 'Retry sync'}
          </Button>
        )}
      </div>
    </div>
  )
}
