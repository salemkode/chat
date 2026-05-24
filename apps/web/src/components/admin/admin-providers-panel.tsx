/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, no-underscore-dangle -- Convex hooks */
import { useMutation } from 'convex/react'
import { Loader2, Plus, WandSparkles } from '@/lib/icons'
import { api } from '@convex/_generated/api'
import { useAdminDiscovery } from '@/components/admin/admin-discovery-context'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import {
  AdminEmptyState,
  AdminRecord,
  AdminSectionCard,
  AdminStatPill,
  adminChipClass,
  adminInsetClass,
} from '@/components/admin/admin-surface'
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
import { InfiniteScrollTrigger } from '@/components/infinite-scroll-trigger'
import { usePaginatedQuery } from '@/lib/convex-query-cache'

type AdminProvidersPanelProps = Pick<AdminOutletContext, 'dashboard' | 'onOpenProviderDialog'>

function normalizeIconType(value: string | undefined): IconType {
  switch (value) {
    case 'emoji':
    case 'lucide':
    case 'phosphor':
    case 'upload':
      return value
    default:
      return undefined
  }
}

export function AdminProvidersPanel({ dashboard: _dashboard, onOpenProviderDialog }: AdminProvidersPanelProps) {
  const discovery = useAdminDiscovery()
  const deleteProvider = useMutation(api.admin.deleteProvider)
  const toggleProviderEnabled = useMutation(api.admin.toggleProviderEnabled)
  const providersQuery = usePaginatedQuery(api.admin.listAdminProviders, {}, { initialNumItems: 50 })
  const providers = providersQuery.results ?? []

  return (
    <div className="grid gap-4">
      <AdminSectionCard
        eyebrow="Provider catalog"
        title="Provider fleet"
        description="Each provider stays compact: identity, current visibility, traffic, and the latest inspection signal live in one operational row instead of a showcase card."
      >
        {providersQuery.results === undefined ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : providers.length > 0 ? (
          <div className="grid gap-3">
            {providers.map((provider: AdminProvider) => (
              <AdminRecord
                key={provider._id}
                icon={
                  <EntityIcon
                    icon={provider.icon}
                    iconType={normalizeIconType(provider.iconType)}
                    iconUrl={provider.iconUrl}
                    fallback="Boxes"
                  />
                }
                title={<span className="truncate">{provider.name}</span>}
                subtitle={`${provider.providerType} provider`}
                badges={
                  <>
                    <Badge variant="secondary">{provider.modelCount} models</Badge>
                    {provider.lastDiscoveryError ? (
                      <Badge variant="destructive">Discovery failed</Badge>
                    ) : null}
                  </>
                }
                summary={
                  provider.lastDiscoveryError ? (
                    provider.lastDiscoveryError
                  ) : (
                    <>
                      {provider.enabledModelCount} visible now. Last inspection found{' '}
                      {provider.lastDiscoveredModelCount ?? 0} models on{' '}
                      {formatDateTime(provider.lastDiscoveredAt)}.
                    </>
                  )
                }
                metrics={
                  <>
                    <AdminStatPill
                      label="Visible"
                      value={`${provider.enabledModelCount}/${provider.modelCount}`}
                    />
                    <AdminStatPill
                      label="Requests"
                      value={formatCompactNumber(provider.usage.requests)}
                    />
                    <AdminStatPill
                      label="Tokens"
                      value={formatCompactNumber(provider.usage.tokens)}
                    />
                    <AdminStatPill label="Accounts" value={String(provider.usage.users)} />
                  </>
                }
                actions={
                  <div className="flex flex-col gap-3 sm:items-end">
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
                      <span className={adminChipClass}>
                        {provider.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground sm:text-right">
                      Last inspection: {formatDateTime(provider.lastDiscoveredAt)}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
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
                  </div>
                }
              />
            ))}
            <InfiniteScrollTrigger
              hasMore={
                providersQuery.status === 'CanLoadMore' ||
                providersQuery.status === 'LoadingMore'
              }
              isLoadingMore={providersQuery.status === 'LoadingMore'}
              onLoadMore={() => providersQuery.loadMore(50)}
              loadingLabel="Loading more providers..."
            />
          </div>
        ) : (
          <AdminEmptyState
            title="No providers yet"
            description="Create a provider to connect a catalog, inspect available models, and start curating what appears in the app."
          />
        )}
      </AdminSectionCard>

      {discovery.discoveryResult ? (
        <AdminSectionCard
          eyebrow="Provider inspection"
          title="Discovery and import"
          description={
            discovery.discoveryResult.source.endpoint ||
            discovery.discoveryResult.source.baseURL ||
            'Provider discovery'
          }
          action={
            discovery.activeDiscoveryProviderId ? (
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
            )
          }
        >
          <div className="flex flex-wrap gap-2">
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
              <div className={`${adminInsetClass} flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between`}>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Search and select models</p>
                  <p className="text-sm text-muted-foreground">
                    Keep inspection richer than the main provider list: search by name, model ID,
                    owner, or capabilities, then import only what belongs in the catalog.
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

              <div className={`${adminInsetClass} overflow-hidden`}>
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
                          const isImported = discovery.existingDiscoveredModelIds.has(model.modelId)

                          return (
                            <CommandItem
                              key={model.modelId}
                              value={`${model.displayName} ${model.modelId} ${model.ownedBy ?? ''} ${formatModelModalities(model.modalities)}`}
                              onSelect={() =>
                                discovery.toggleDiscoveryModelSelection(model.modelId)
                              }
                              className="items-start gap-3 px-4 py-3"
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
        </AdminSectionCard>
      ) : null}
    </div>
  )
}
