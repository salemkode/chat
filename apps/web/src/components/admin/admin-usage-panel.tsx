import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import {
  formatCompactNumber,
  formatDateTime,
  formatTokenCount,
} from '@/components/admin/admin-utils'
import type { AdminModel, DashboardData } from '@/components/admin/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type AdminUsagePanelProps = Pick<AdminOutletContext, 'dashboard'>

export function AdminUsagePanel({ dashboard }: AdminUsagePanelProps) {
  const models = dashboard.models
  const users = dashboard.users

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
      <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <CardHeader>
          <CardTitle>Model usage</CardTitle>
          <CardDescription>
            Requests, tokens, and the last active account view per model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Accounts</TableHead>
                <TableHead>Last used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models
                .slice()
                .sort(
                  (left: AdminModel, right: AdminModel) => right.usage.tokens - left.usage.tokens,
                )
                .slice(0, 12)
                .map((model: AdminModel) => (
                  <TableRow key={model._id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{model.displayName}</p>
                        <p className="font-mono text-xs text-muted-foreground">{model.modelId}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatCompactNumber(model.usage.requests)}</TableCell>
                    <TableCell>{formatTokenCount(model.usage.tokens)}</TableCell>
                    <TableCell>{model.usage.users}</TableCell>
                    <TableCell>{formatDateTime(model.usage.lastUsedAt)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <CardHeader>
          <CardTitle>Account activity</CardTitle>
          <CardDescription>
            Which accounts are using models, and how much they consume.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Models</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.slice(0, 12).map((user: DashboardData['users'][number]) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email || 'No email'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{formatCompactNumber(user.requests)}</TableCell>
                  <TableCell>{formatTokenCount(user.tokens)}</TableCell>
                  <TableCell>{user.models}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
