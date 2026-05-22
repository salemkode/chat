/* eslint-disable no-underscore-dangle -- Convex hooks */
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import {
  AdminRecord,
  AdminSectionCard,
  AdminStatPill,
  adminChipClass,
} from '@/components/admin/admin-surface'
import {
  formatCompactNumber,
  formatDateTime,
  formatTokenCount,
  getProviderName,
} from '@/components/admin/admin-utils'
import type { AdminModel, DashboardData } from '@/components/admin/types'

type AdminUsagePanelProps = Pick<AdminOutletContext, 'dashboard'>

export function AdminUsagePanel({ dashboard }: AdminUsagePanelProps) {
  const models = dashboard.models
  const providers = dashboard.providers
  const users = dashboard.users

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <AdminSectionCard
        eyebrow="Usage analytics"
        title="Model demand"
        description="Usage now reads as a ranked operations list so the busiest models are easy to compare without scanning a gallery of cards."
      >
        <div className="grid gap-3">
          {models
            .toSorted(
              (left: AdminModel, right: AdminModel) => right.usage.tokens - left.usage.tokens,
            )
            .slice(0, 12)
            .map((model: AdminModel, index: number) => (
              <AdminRecord
                key={model._id}
                title={<span className="truncate">{model.displayName}</span>}
                subtitle={
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={adminChipClass}>#{index + 1}</span>
                    <span>{getProviderName(providers, model.providerId)}</span>
                    <span className="truncate font-mono text-xs">{model.modelId}</span>
                  </div>
                }
                metrics={
                  <>
                    <AdminStatPill
                      label="Requests"
                      value={formatCompactNumber(model.usage.requests)}
                    />
                    <AdminStatPill label="Tokens" value={formatTokenCount(model.usage.tokens)} />
                    <AdminStatPill label="Accounts" value={String(model.usage.users)} />
                  </>
                }
                actions={
                  <div className="text-sm sm:text-right">
                    <p className="font-medium text-foreground">Last used</p>
                    <p className="text-muted-foreground">{formatDateTime(model.usage.lastUsedAt)}</p>
                  </div>
                }
              />
            ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        eyebrow="Account activity"
        title="Top consuming accounts"
        description="The right panel mirrors the same row pattern so account traffic is easier to compare against model demand."
      >
        <div className="grid gap-3">
          {users.slice(0, 12).map((user: DashboardData['users'][number], index: number) => (
            <AdminRecord
              key={user.userId}
              title={<span className="truncate">{user.name}</span>}
              subtitle={user.email || 'No email'}
              badges={<span className={adminChipClass}>#{index + 1}</span>}
              metrics={
                <>
                  <AdminStatPill label="Requests" value={formatCompactNumber(user.requests)} />
                  <AdminStatPill label="Tokens" value={formatTokenCount(user.tokens)} />
                  <AdminStatPill label="Models" value={String(user.models)} />
                </>
              }
              actions={<span className={adminChipClass}>{user.appPlan.toUpperCase()}</span>}
            />
          ))}
        </div>
      </AdminSectionCard>
    </div>
  )
}
