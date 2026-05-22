import { ArrowLeft, Bot, Boxes, RefreshCcw, Shield, Sparkles, Users } from '@/lib/icons'
import type { AdminCollectionDialogProps } from '@/components/admin/admin-collection-dialog'
import { AdminCollectionDialog } from '@/components/admin/admin-collection-dialog'
import type { AdminModelDialogProps } from '@/components/admin/admin-model-dialog'
import { AdminModelDialog } from '@/components/admin/admin-model-dialog'
import type { AdminProviderDialogProps } from '@/components/admin/admin-provider-dialog'
import { AdminProviderDialog } from '@/components/admin/admin-provider-dialog'
import {
  AdminStatPill,
  adminChipClass,
  adminPanelClass,
} from '@/components/admin/admin-surface'
import type { DashboardData } from '@/components/admin/types'
import { Button } from '@/components/ui/button'

type AdminPageHeaderProps = {
  onNavigateHome: () => void
  providerDialog: AdminProviderDialogProps
  modelDialog: AdminModelDialogProps
  collectionDialog: AdminCollectionDialogProps
  summary: DashboardData['summary'] | undefined
}

export function AdminPageHeader({
  onNavigateHome,
  providerDialog,
  modelDialog,
  collectionDialog,
  summary,
}: AdminPageHeaderProps) {
  const quickStats = [
    {
      label: 'Providers',
      value: `${summary?.enabledProviders ?? 0}/${summary?.totalProviders ?? 0}`,
      icon: Boxes,
    },
    {
      label: 'Models',
      value: String(summary?.visibleModels ?? 0),
      icon: Bot,
    },
    {
      label: 'Requests',
      value: `${summary?.totalRequests30d ?? 0}`,
      icon: Sparkles,
    },
    {
      label: 'Accounts',
      value: String(summary?.activeUsers30d ?? 0),
      icon: Users,
    },
  ]

  return (
    <header className={`${adminPanelClass} p-5 md:p-6`}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="w-fit" onClick={() => void onNavigateHome()}>
              <ArrowLeft className="mr-2 size-4" />
              Back to chat
            </Button>

            <div className="space-y-3">
              <div className={adminChipClass}>
                <Shield className="size-3.5" />
                Admin control plane
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground md:text-[2.2rem]">
                  Keep the catalog readable, healthy, and easy to operate.
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Providers, models, offers, usage, and billing all stay in one calmer workspace so
                  the operational state is easy to scan at a glance.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-[28rem] lg:justify-end">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCcw className="mr-2 size-4" />
              Refresh
            </Button>
            <AdminProviderDialog state={providerDialog.state} actions={providerDialog.actions} />
            <AdminModelDialog state={modelDialog.state} actions={modelDialog.actions} />
            <AdminCollectionDialog state={collectionDialog.state} actions={collectionDialog.actions} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {quickStats.map(({ label, value, icon: Icon }) => (
            <AdminStatPill
              key={label}
              label={label}
              value={
                <span className="inline-flex items-center gap-2">
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span>{value}</span>
                </span>
              }
            />
          ))}
          <div className={adminChipClass}>Catalog governance</div>
          <div className={adminChipClass}>Provider diagnostics</div>
          <div className={adminChipClass}>Usage telemetry</div>
        </div>
      </div>
    </header>
  )
}
