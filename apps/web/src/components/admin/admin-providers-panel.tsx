/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Convex hooks */
import { useMutation } from 'convex/react'
import { Loader2, Plus, WandSparkles } from '@/lib/icons'
import { api } from '@convex/_generated/api'
import { useAdminDiscovery } from '@/components/admin/admin-discovery-context'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import { EntityIcon } from '@/components/admin/entity-icon'
import {
  formatDateTime,
  formatModelModalities,
  formatTokenCount,
  formatCompactNumber,
} from '@/components/admin/admin-utils'
import type { AdminProvider, IconType, ProviderCatalogResult } from '@/components/admin/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type AdminProvidersPanelProps = Pick<AdminOutletContext, 'dashboard' | 'onOpenProviderDialog'>

export function AdminProvidersPanel({ dashboard, onOpenProviderDialog }: AdminProvidersPanelProps) {
  const discovery = useAdminDiscovery()
  const deleteProvider = useMutation(api.admin.deleteProvider)
  const toggleProviderEnabled = useMutation(api.admin.toggleProviderEnabled)
  const providers = dashboard.providers

  return (
    <div className="grid gap-4">
      <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <CardHeader>
          <CardTitle>Providers</CardTitle>
          <CardDescription>
            Manage provider credentials, inspect API model catalogs, and apply provider-wide limits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catalog</TableHead>
                <TableHead>Usage / 30d</TableHead>
                <TableHead>Last discovery</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider: AdminProvider) => (
                <TableRow key={provider._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background">
                        <EntityIcon
                          icon={provider.icon}
                          iconType={provider.iconType as IconType}
                          iconUrl={provider.iconUrl}
                          fallback="Boxes"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-xs text-muted-foreground">{provider.providerType}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={provider.isEnabled}
                        onCheckedChange={(checked) =>
                          void toggleProviderEnabled({
                            id: provider._id,
                            isEnabled: checked,
                          })
                        }
                      />
                      <Badge variant={provider.isEnabled ? 'default' : 'secondary'}>
                        {provider.isEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>{provider.modelCount} models</p>
                      <p>{provider.enabledModelCount} visible</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>{formatCompactNumber(provider.usage.requests)} requests</p>
                      <p>{formatCompactNumber(provider.usage.tokens)} tokens</p>
                      <p>{provider.usage.users} accounts</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <p>{formatDateTime(provider.lastDiscoveredAt)}</p>
                    {provider.lastDiscoveryError ? (
                      <p className="text-destructive">Discovery failed</p>
                    ) : (
                      <p>{provider.lastDiscoveredModelCount ?? 0} models</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void discovery.inspectSavedProvider(provider)}
                        disabled={discovery.discoveringProviderId === provider._id}
                      >
                        {discovery.discoveringProviderId === provider._id ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <WandSparkles className="mr-2 size-4" />
                        )}
                        Inspect
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenProviderDialog(provider)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => void deleteProvider({ id: provider._id })}
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

      {discovery.discoveryResult ? (
        <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle>Provider inspection result</CardTitle>
            <CardDescription>
              {discovery.discoveryResult.source.endpoint ||
                discovery.discoveryResult.source.baseURL ||
                'Provider discovery'}
            </CardDescription>
            <CardAction>
              {discovery.activeDiscoveryProviderId ? (
                <Button
                  onClick={() => void discovery.importSelectedModels()}
                  disabled={
                    !discovery.discoveryResult.ok ||
                    discovery.isImportingDiscovery ||
                    discovery.selectedDiscoveredCount === 0
                  }
                >
                  {discovery.isImportingDiscovery ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 size-4" />
                  )}
                  Import {discovery.selectedDiscoveredCount} selected
                </Button>
              ) : (
                <Badge variant="secondary">Save provider to import</Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <Badge variant={discovery.discoveryResult.ok ? 'default' : 'destructive'}>
                {discovery.discoveryResult.ok ? 'Discovery succeeded' : 'Discovery failed'}
              </Badge>
              <Badge variant="secondary">{discovery.discoveryResult.providerType}</Badge>
              <Badge variant="secondary">{discovery.discoveryResult.modelCount} models</Badge>
              {discovery.discoveryResult.ok ? (
                <Badge variant="secondary">{discovery.selectedDiscoveredCount} selected</Badge>
              ) : null}
              <Badge variant="secondary">{discovery.discoveryResult.source.discoveryMode}</Badge>
            </div>

            {discovery.discoveryResult.ok ? (
              <div className="grid gap-4">
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Search and select models to import</p>
                    <p className="text-sm text-muted-foreground">
                      Inspect keeps the full provider catalog available. Search by name, model ID,
                      owner, or capabilities, then import only the models you need.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={discovery.selectAllDiscoveredModels}
                      disabled={discovery.discoveryResult.models.length === 0}
                    >
                      Select all
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={discovery.clearDiscoveredModelSelection}
                      disabled={discovery.selectedDiscoveryModelIds.length === 0}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-background">
                  <Command>
                    <CommandInput placeholder="Search inspected models" />
                    <CommandList className="max-h-[420px]">
                      <CommandGroup
                        heading={`Discovered models (${discovery.discoveryResult.modelCount})`}
                      >
                        {discovery.discoveryResult.models.map(
                          (model: ProviderCatalogResult['models'][number]) => {
                            const isSelected = discovery.selectedDiscoveryModelIds.includes(
                              model.modelId,
                            )
                            const isImported = discovery.existingDiscoveredModelIds.has(
                              model.modelId,
                            )

                            return (
                              <CommandItem
                                key={model.modelId}
                                value={`${model.displayName} ${model.modelId} ${model.ownedBy ?? ''} ${formatModelModalities(model.modalities)}`}
                                onSelect={() =>
                                  discovery.toggleDiscoveryModelSelection(model.modelId)
                                }
                                className="items-start gap-3 py-3"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  tabIndex={-1}
                                  aria-hidden="true"
                                  className="pointer-events-none mt-1"
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-medium">{model.displayName}</span>
                                    {isImported ? <Badge variant="secondary">Added</Badge> : null}
                                    {isSelected ? <Badge variant="outline">Selected</Badge> : null}
                                  </div>
                                  <p className="truncate font-mono text-xs text-muted-foreground">
                                    {model.modelId}
                                  </p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span>Owner: {model.ownedBy || 'Unknown'}</span>
                                    <span>
                                      Context:{' '}
                                      {model.contextWindow
                                        ? formatTokenCount(model.contextWindow)
                                        : 'n/a'}
                                    </span>
                                    <span>
                                      Max output:{' '}
                                      {model.maxOutputTokens
                                        ? formatTokenCount(model.maxOutputTokens)
                                        : 'n/a'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Modalities: {formatModelModalities(model.modalities)}
                                  </p>
                                </div>
                              </CommandItem>
                            )
                          },
                        )}
                      </CommandGroup>
                      <CommandEmpty>No matching models.</CommandEmpty>
                    </CommandList>
                  </Command>
                </div>

                <div className="flex justify-end">
                  {discovery.activeDiscoveryProviderId ? (
                    <Button
                      onClick={() => void discovery.importSelectedModels()}
                      disabled={
                        discovery.isImportingDiscovery || discovery.selectedDiscoveredCount === 0
                      }
                    >
                      {discovery.isImportingDiscovery ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 size-4" />
                      )}
                      Save selected models ({discovery.selectedDiscoveredCount})
                    </Button>
                  ) : (
                    <Badge variant="secondary">Save provider to import</Badge>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
