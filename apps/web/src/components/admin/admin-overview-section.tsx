import { Bot, Boxes, Sparkles, Users } from '@/lib/icons'
import { AdminMetricCard } from '@/components/admin/admin-surface'
import { formatCompactNumber } from '@/components/admin/admin-utils'
import type { DashboardData } from '@/components/admin/types'

interface AdminOverviewSectionProps {
  summary: DashboardData['summary'] | undefined
}

export function AdminOverviewSection({ summary }: AdminOverviewSectionProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        label="Providers"
        value={String(summary?.totalProviders ?? 0)}
        description={`${summary?.enabledProviders ?? 0} enabled`}
        icon={Boxes}
        accentClassName="bg-[#f5e8cb] text-[#8a5b16] dark:bg-[#3b2a17] dark:text-[#f2c57d]"
      />
      <AdminMetricCard
        label="Visible models"
        value={String(summary?.visibleModels ?? 0)}
        description={`${summary?.hiddenModels ?? 0} hidden`}
        icon={Bot}
        accentClassName="bg-[#d8ebf8] text-[#16588a] dark:bg-[#143043] dark:text-[#89c7f6]"
      />
      <AdminMetricCard
        label="Requests / 30d"
        value={formatCompactNumber(summary?.totalRequests30d ?? 0)}
        description={`${formatCompactNumber(summary?.totalTokens30d ?? 0)} tokens`}
        icon={Sparkles}
        accentClassName="bg-[#ece3ff] text-[#6f43bd] dark:bg-[#261d38] dark:text-[#ccb5ff]"
      />
      <AdminMetricCard
        label="Active accounts"
        value={String(summary?.activeUsers30d ?? 0)}
        description="Recent usage across the last 30 days"
        icon={Users}
        accentClassName="bg-[#ddeedc] text-[#2a6c3a] dark:bg-[#173020] dark:text-[#9ed4ac]"
      />
    </section>
  )
}
