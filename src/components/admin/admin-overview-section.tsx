import type { LucideIcon } from 'lucide-react'
import { Bot, Boxes, Sparkles, Users } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  formatCompactNumber,
  usageChartConfig,
} from '@/components/admin/admin-utils'
import type { DashboardData } from '@/components/admin/types'

interface AdminOverviewSectionProps {
  summary: DashboardData['summary'] | undefined
  usageSeries: DashboardData['usageSeries']
  users: DashboardData['users']
}

export function AdminOverviewSection({
  summary,
  usageSeries,
  users,
}: AdminOverviewSectionProps) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Providers"
          value={String(summary?.totalProviders ?? 0)}
          description={`${summary?.enabledProviders ?? 0} enabled across the catalog`}
          icon={Boxes}
        />
        <StatCard
          title="Visible models"
          value={String(summary?.visibleModels ?? 0)}
          description={`${summary?.hiddenModels ?? 0} hidden from the selector`}
          icon={Bot}
        />
        <StatCard
          title="Requests / 30d"
          value={formatCompactNumber(summary?.totalRequests30d ?? 0)}
          description={`${formatCompactNumber(summary?.totalTokens30d ?? 0)} tokens processed`}
          icon={Sparkles}
        />
        <StatCard
          title="Active accounts"
          value={String(summary?.activeUsers30d ?? 0)}
          description="Distinct users with model activity in the last 30 days"
          icon={Users}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle>Usage trend</CardTitle>
            <CardDescription>
              Requests and tokens over the last 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={usageChartConfig}
              className="h-[280px] w-full"
            >
              <AreaChart data={usageSeries}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  dataKey="requests"
                  type="monotone"
                  fill="var(--color-requests)"
                  fillOpacity={0.18}
                  stroke="var(--color-requests)"
                  strokeWidth={2}
                />
                <Area
                  dataKey="tokens"
                  type="monotone"
                  fill="var(--color-tokens)"
                  fillOpacity={0.12}
                  stroke="var(--color-tokens)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle>Top accounts</CardTitle>
            <CardDescription>Who is using the catalog the most.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {users.slice(0, 5).map((user: DashboardData['users'][number]) => (
              <div
                key={user.userId}
                className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email || 'No email'}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{formatCompactNumber(user.requests)} req</p>
                  <p>{formatCompactNumber(user.tokens)} tokens</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string
  description: string
  icon: LucideIcon
}) {
  return (
    <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{title}</CardDescription>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-3xl tracking-tight">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
