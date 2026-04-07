/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Convex hooks */
import { useMutation } from 'convex/react'
import { Eye, EyeOff } from '@/lib/icons'
import { api } from '@convex/_generated/api'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import { EntityIcon } from '@/components/admin/entity-icon'
import {
  formatCompactNumber,
  getProviderName,
} from '@/components/admin/admin-utils'
import type { AdminModel, IconType } from '@/components/admin/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type AdminModelsPanelProps = Pick<
  AdminOutletContext,
  'dashboard' | 'onOpenModelDialog'
>

export function AdminModelsPanel({
  dashboard,
  onOpenModelDialog,
}: AdminModelsPanelProps) {
  const toggleModelEnabled = useMutation(api.admin.toggleModelEnabled)
  const deleteModel = useMutation(api.admin.deleteModel)
  const providers = dashboard.providers
  const models = dashboard.models

  return (
    <div className="grid gap-4">
      <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <CardHeader>
          <CardTitle>Models</CardTitle>
          <CardDescription>
            Show or hide models, set icons per model, and tune custom per-model
            limits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Usage / 30d</TableHead>
                <TableHead>Accounts</TableHead>
                <TableHead>Favorites</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model: AdminModel) => (
                <TableRow key={model._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background">
                        <EntityIcon
                          icon={model.icon}
                          iconType={model.iconType as IconType}
                          iconUrl={model.iconUrl || model.providerIconUrl}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{model.displayName}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {model.modelId}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getProviderName(providers, model.providerId)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={model.isEnabled}
                        onCheckedChange={(checked) =>
                          void toggleModelEnabled({
                            id: model._id,
                            isEnabled: checked,
                          })
                        }
                      />
                      <Badge
                        variant={model.isEnabled ? 'default' : 'secondary'}
                      >
                        {model.isEnabled ? (
                          <>
                            <Eye className="mr-1 size-3.5" />
                            Shown
                          </>
                        ) : (
                          <>
                            <EyeOff className="mr-1 size-3.5" />
                            Hidden
                          </>
                        )}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <p>{formatCompactNumber(model.usage.requests)} requests</p>
                    <p>{formatCompactNumber(model.usage.tokens)} tokens</p>
                  </TableCell>
                  <TableCell>{model.usage.users}</TableCell>
                  <TableCell>{model.favorites}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenModelDialog(model)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => void deleteModel({ id: model._id })}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
