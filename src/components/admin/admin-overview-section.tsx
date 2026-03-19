import type { LucideIcon } from 'lucide-react'
import { Bot, Boxes, Sparkles, Users } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  userSearchQuery: string
  searchedUsers: Array<{
    userId: string
    name: string
    email?: string
    appPlan: 'free' | 'pro'
    requests: number
    tokens: number
  }>
  selectedUserId?: string
  isUpdatingUserPlan: boolean
  onUserSearchQueryChange: (value: string) => void
  onSelectUser: (userId: string) => void
  onSetUserPlan: (appPlan: 'free' | 'pro') => void
}

export function AdminOverviewSection({
  summary,
  usageSeries,
  users,
  userSearchQuery,
  searchedUsers,
  selectedUserId,
  isUpdatingUserPlan,
  onUserSearchQueryChange,
  onSelectUser,
  onSetUserPlan,
}: AdminOverviewSectionProps) {
  const selectedUser =
    searchedUsers.find((user: AdminOverviewSectionProps['searchedUsers'][number]) => user.userId === selectedUserId) ??
    users.find((user: DashboardData['users'][number]) => user.userId === selectedUserId)

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
            <CardDescription>
              Who is using the catalog the most. Set user plan from search or top accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Input
                value={userSearchQuery}
                onChange={(event) => onUserSearchQueryChange(event.target.value)}
                placeholder="Search user by email or name..."
              />
              {userSearchQuery.trim().length >= 2 ? (
                searchedUsers.length > 0 ? (
                  <div className="grid gap-2">
                    {searchedUsers.map((user) => (
                      <button
                        key={user.userId}
                        type="button"
                        onClick={() => onSelectUser(user.userId)}
                        className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-left hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email || 'No email'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">{user.appPlan.toUpperCase()}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No matching users.</p>
                )
              ) : null}
            </div>

            {selectedUser ? (
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                <p className="font-medium">{selectedUser.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedUser.email || 'No email'}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Current plan: {selectedUser.appPlan.toUpperCase()}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onSetUserPlan('pro')}
                    disabled={isUpdatingUserPlan}
                  >
                    Set Pro
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSetUserPlan('free')}
                    disabled={isUpdatingUserPlan}
                  >
                    Set Free
                  </Button>
                </div>
              </div>
            ) : null}

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
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{formatCompactNumber(user.requests)} req</p>
                    <p>{formatCompactNumber(user.tokens)} tokens</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectUser(user.userId)}
                  >
                    Select
                  </Button>
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
