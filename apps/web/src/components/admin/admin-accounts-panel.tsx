/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Convex hooks */
import { useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { parseConvexIdForTable } from '@chat/shared/logic/convex-ids'
import { Loader2 } from '@/lib/icons'
import { api } from '@convex/_generated/api'
import {
  AdminEmptyState,
  AdminMiniStat,
  AdminSectionCard,
  adminChipClass,
  adminInsetClass,
} from '@/components/admin/admin-surface'
import { formatCompactNumber, formatDateTime } from '@/components/admin/admin-utils'
import type { AdminAccount } from '@/components/admin/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePaginatedQuery } from '@/lib/convex-query-cache'
import { toast } from 'sonner'

export function AdminAccountsPanel() {
  const [query, setQuery] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const setUserAppPlan = useMutation(api.admin.setUserAppPlan)

  const trimmedQuery = query.trim()
  const accountsQuery = usePaginatedQuery(
    api.admin.listAdminAccounts,
    trimmedQuery.length > 0 ? { query: trimmedQuery } : {},
    { initialNumItems: 50 },
  )

  const accounts = accountsQuery.results ?? []
  const totalAccounts = accounts.length
  const isLoading = accountsQuery.results === undefined
  const hasQuery = trimmedQuery.length > 0

  const headerDescription = useMemo(() => {
    if (hasQuery) {
      return `Showing ${totalAccounts} matching account${totalAccounts === 1 ? '' : 's'}.`
    }
    return `Showing ${totalAccounts} account${totalAccounts === 1 ? '' : 's'} ranked by token usage in the last 30 days.`
  }, [hasQuery, totalAccounts])

  const handleSetPlan = async (account: AdminAccount, nextAppPlan: 'free' | 'pro') => {
    const normalizedUserId = parseConvexIdForTable('users', account.userId)
    if (!normalizedUserId) {
      toast.error('Invalid user id')
      return
    }
    setUpdatingUserId(account.userId)
    try {
      await setUserAppPlan({
        userId: normalizedUserId,
        appPlan: nextAppPlan,
      })
      toast.success(`${account.name} is now on ${nextAppPlan.toUpperCase()}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user plan')
    } finally {
      setUpdatingUserId(null)
    }
  }

  return (
    <AdminSectionCard
      eyebrow="Accounts"
      title="Account management"
      description="Search, review usage, and adjust plans directly from a dense table view. No selection workflow required."
      contentClassName="grid gap-3"
    >
      <div
        className={`${adminInsetClass} flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between`}
      >
        <div className="space-y-1">
          <div className={adminChipClass}>Account directory</div>
          <p className="text-sm text-muted-foreground">{headerDescription}</p>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email..."
          className="w-full bg-background md:max-w-sm"
          aria-label="Search accounts"
        />
      </div>

      {isLoading ? (
        <div className={`${adminInsetClass} flex min-h-40 items-center justify-center`}>
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <AdminEmptyState
          title="No accounts found"
          description={hasQuery ? 'Try a different search term.' : 'No accounts are available yet.'}
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {accounts.map((account: AdminAccount) => {
              const isUpdating = updatingUserId === account.userId
              return (
                <article key={account.userId} className={`${adminInsetClass} grid gap-4 p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium text-foreground">{account.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {account.email || 'No email'}
                      </p>
                    </div>
                    <Badge variant={account.appPlan === 'pro' ? 'default' : 'secondary'}>
                      {account.appPlan.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <AdminMiniStat
                      label="Requests (30d)"
                      value={formatCompactNumber(account.requests30d)}
                    />
                    <AdminMiniStat
                      label="Tokens (30d)"
                      value={formatCompactNumber(account.tokens30d)}
                    />
                    <AdminMiniStat label="Models (30d)" value={String(account.models30d)} />
                    <AdminMiniStat label="Last used" value={formatDateTime(account.lastUsedAt)} />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={isUpdating || account.appPlan === 'free'}
                      onClick={() => void handleSetPlan(account, 'free')}
                    >
                      {isUpdating ? <Loader2 className="size-4 animate-spin" /> : 'Set Free'}
                    </Button>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={isUpdating || account.appPlan === 'pro'}
                      onClick={() => void handleSetPlan(account, 'pro')}
                    >
                      {isUpdating ? <Loader2 className="size-4 animate-spin" /> : 'Set Pro'}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>

          <div className={`${adminInsetClass} hidden overflow-hidden md:block`}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="px-4">Account</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Requests (30d)</TableHead>
                  <TableHead>Tokens (30d)</TableHead>
                  <TableHead>Models (30d)</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account: AdminAccount) => {
                  const isUpdating = updatingUserId === account.userId
                  return (
                    <TableRow key={account.userId}>
                      <TableCell className="px-4 py-3">
                        <div className="min-w-[14rem] space-y-0.5">
                          <p className="truncate text-sm font-medium text-foreground">
                            {account.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {account.email || 'No email'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant={account.appPlan === 'pro' ? 'default' : 'secondary'}>
                          {account.appPlan.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        {formatCompactNumber(account.requests30d)}
                      </TableCell>
                      <TableCell className="py-3">
                        {formatCompactNumber(account.tokens30d)}
                      </TableCell>
                      <TableCell className="py-3">{account.models30d}</TableCell>
                      <TableCell className="py-3">{formatDateTime(account.lastUsedAt)}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isUpdating || account.appPlan === 'free'}
                            onClick={() => void handleSetPlan(account, 'free')}
                          >
                            {isUpdating ? <Loader2 className="size-4 animate-spin" /> : 'Set Free'}
                          </Button>
                          <Button
                            size="sm"
                            disabled={isUpdating || account.appPlan === 'pro'}
                            onClick={() => void handleSetPlan(account, 'pro')}
                          >
                            {isUpdating ? <Loader2 className="size-4 animate-spin" /> : 'Set Pro'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {accountsQuery.status === 'CanLoadMore' || accountsQuery.status === 'LoadingMore' ? (
              <div className="border-t border-border px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => accountsQuery.loadMore(50)}
                  disabled={accountsQuery.status === 'LoadingMore'}
                >
                  {accountsQuery.status === 'LoadingMore'
                    ? 'Loading more accounts...'
                    : 'Load more accounts'}
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </AdminSectionCard>
  )
}
