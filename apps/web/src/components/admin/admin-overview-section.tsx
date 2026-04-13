/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Convex hooks */
import { useMutation } from 'convex/react'
import type { Id } from '@convex/_generated/dataModel'
import type { AppIcon } from '@/lib/icons'
import { Bot, Boxes, Sparkles, Users } from '@/lib/icons'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCompactNumber } from '@/components/admin/admin-utils'
import type { DashboardData } from '@/components/admin/types'
import { useQuery } from '@/lib/convex-query-cache'

export function useAdminOverviewUserControls({
  isAuthenticated,
  isUserReady,
  isAdmin,
  users,
}: {
  isAuthenticated: boolean
  isUserReady: boolean
  isAdmin: boolean | undefined
  users: DashboardData['users']
}) {
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>()
  const [isUpdatingUserPlan, setIsUpdatingUserPlan] = useState(false)
  const setUserAppPlan = useMutation(api.admin.setUserAppPlan)
  const searchedUsers = useQuery(
    api.admin.searchUsersForAdmin,
    isAuthenticated && isUserReady && isAdmin && userSearchQuery.trim().length >= 2
      ? { query: userSearchQuery, limit: 8 }
      : 'skip',
  )

  useEffect(() => {
    if (!selectedUserId && users[0]?.userId) {
      setSelectedUserId(users[0].userId)
    }
  }, [selectedUserId, users])

  const handleSetUserPlan = useCallback(
    (nextAppPlan: 'free' | 'pro') => {
      if (!selectedUserId) {
        toast.error('Select a user first')
        return
      }
      setIsUpdatingUserPlan(true)
      return setUserAppPlan({
        userId: selectedUserId as Id<'users'>,
        appPlan: nextAppPlan,
      })
        .then(() => {
          toast.success(`User plan set to ${nextAppPlan.toUpperCase()}`)
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : 'Failed to update user plan')
        })
        .finally(() => {
          setIsUpdatingUserPlan(false)
        })
    },
    [selectedUserId, setUserAppPlan],
  )

  return {
    userSearchQuery,
    setUserSearchQuery,
    searchedUsers: searchedUsers ?? [],
    selectedUserId,
    setSelectedUserId,
    isUpdatingUserPlan,
    handleSetUserPlan,
  }
}

export type AdminOverviewUserControls = ReturnType<typeof useAdminOverviewUserControls>

interface AdminOverviewSectionProps {
  summary: DashboardData['summary'] | undefined
  users: DashboardData['users']
  controls: AdminOverviewUserControls
}

export function AdminOverviewSection({ summary, users, controls }: AdminOverviewSectionProps) {
  const {
    userSearchQuery,
    setUserSearchQuery,
    searchedUsers,
    selectedUserId,
    setSelectedUserId,
    isUpdatingUserPlan,
    handleSetUserPlan,
  } = controls

  const selectedUser =
    searchedUsers.find(
      (user: AdminOverviewUserControls['searchedUsers'][number]) => user.userId === selectedUserId,
    ) ?? users.find((user: DashboardData['users'][number]) => user.userId === selectedUserId)

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

      <div className="grid gap-4">
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
                onChange={(event) => setUserSearchQuery(event.target.value)}
                placeholder="Search user by email or name..."
              />
              {userSearchQuery.trim().length >= 2 ? (
                searchedUsers.length > 0 ? (
                  <div className="grid gap-2">
                    {searchedUsers.map(
                      (user: AdminOverviewUserControls['searchedUsers'][number]) => (
                        <button
                          key={user.userId}
                          type="button"
                          onClick={() => setSelectedUserId(user.userId)}
                          className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-left hover:bg-muted/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{user.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.email || 'No email'}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {user.appPlan.toUpperCase()}
                          </p>
                        </button>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No matching users.</p>
                )
              ) : null}
            </div>

            {selectedUser ? (
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                <p className="font-medium">{selectedUser.name}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email || 'No email'}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Current plan: {selectedUser.appPlan.toUpperCase()}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleSetUserPlan('pro')}
                    disabled={isUpdatingUserPlan}
                  >
                    Set Pro
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleSetUserPlan('free')}
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
                    onClick={() => setSelectedUserId(user.userId)}
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
  icon: AppIcon
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
