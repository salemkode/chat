import { ArrowLeft, RefreshCcw, Shield } from 'lucide-react'
import type { AdminCollectionDialogProps } from '@/components/admin/admin-collection-dialog'
import { AdminCollectionDialog } from '@/components/admin/admin-collection-dialog'
import type { AdminModelDialogProps } from '@/components/admin/admin-model-dialog'
import { AdminModelDialog } from '@/components/admin/admin-model-dialog'
import type { AdminProviderDialogProps } from '@/components/admin/admin-provider-dialog'
import { AdminProviderDialog } from '@/components/admin/admin-provider-dialog'
import { Button } from '@/components/ui/button'

export type AdminPageHeaderProps = {
  onNavigateHome: () => void
  providerDialog: AdminProviderDialogProps
  modelDialog: AdminModelDialogProps
  collectionDialog: AdminCollectionDialogProps
}

export function AdminPageHeader({
  onNavigateHome,
  providerDialog,
  modelDialog,
  collectionDialog,
}: AdminPageHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
      <div className="pointer-events-none absolute right-8 top-8 hidden h-28 w-28 rounded-full border border-zinc-200 bg-[#f5f5f4] lg:block dark:border-zinc-800 dark:bg-[#151518]" />
      <div className="pointer-events-none absolute -bottom-12 right-20 hidden h-28 w-28 rotate-12 rounded-4xl border border-violet-200 bg-[#efe3ff] lg:block dark:border-violet-900 dark:bg-[#231730]" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" onClick={() => void onNavigateHome()}>
            <ArrowLeft className="mr-2 size-4" />
            Back to chat
          </Button>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              <Shield className="size-3.5" />
              Admin control plane
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Model and provider dashboard
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              Manage provider APIs, sync model catalogs, tune per-model
              visibility, assign icons, monitor account usage, and apply layered
              rate limits.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCcw className="mr-2 size-4" />
            Refresh
          </Button>
          <AdminProviderDialog
            state={providerDialog.state}
            actions={providerDialog.actions}
          />
          <AdminModelDialog
            state={modelDialog.state}
            actions={modelDialog.actions}
          />
          <AdminCollectionDialog
            state={collectionDialog.state}
            actions={collectionDialog.actions}
          />
        </div>
      </div>
    </header>
  )
}
