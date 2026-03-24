/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Convex hooks */
import { useAction, useMutation } from 'convex/react'
import {
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Settings2,
  WandSparkles,
} from 'lucide-react'
import { useCallback, useReducer } from 'react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { useAdminDiscovery } from '@/components/admin/admin-discovery-context'
import {
  initialSettingsState,
  mergeReducer,
  type SettingsState,
} from '@/components/admin/admin-form-state'
import { EntityIcon } from '@/components/admin/entity-icon'
import {
  formatCompactNumber,
  formatDateTime,
  formatModelModalities,
  formatTokenCount,
  getProviderName,
} from '@/components/admin/admin-utils'
import type {
  AdminModel,
  AdminModelCollection,
  AdminProvider,
  ProviderCatalogResult,
  DashboardData,
  IconType,
} from '@/components/admin/types'
import {
  RateLimitEditor,
  type RateLimitPolicy,
} from '@/components/admin/rate-limit-editor'
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
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AppPlan } from '@chat/shared/admin-types'

interface AdminTabsSectionProps {
  dashboard: DashboardData
  onOpenProviderDialog: (provider?: AdminProvider) => void
  onOpenModelDialog: (model?: AdminModel) => void
  onOpenCollectionDialog: (collection?: AdminModelCollection) => void
}

export function AdminTabsSection({
  dashboard,
  onOpenProviderDialog,
  onOpenModelDialog,
  onOpenCollectionDialog,
}: AdminTabsSectionProps) {
  const discovery = useAdminDiscovery()

  const deleteProvider = useMutation(api.admin.deleteProvider)
  const toggleProviderEnabled = useMutation(api.admin.toggleProviderEnabled)
  const toggleModelEnabled = useMutation(api.admin.toggleModelEnabled)
  const deleteModel = useMutation(api.admin.deleteModel)
  const deleteModelCollection = useMutation(api.admin.deleteModelCollection)

  const [settingsState, updateSettings] = useReducer(
    mergeReducer<SettingsState>,
    initialSettingsState,
  )
  const updateAdminSettings = useMutation(api.admin.updateAdminSettings)
  const createProSubscriptionCheckout = useAction(
    api.stripe.createProSubscriptionCheckout,
  )
  const createBillingPortalSession = useAction(
    api.stripe.createBillingPortalSession,
  )

  const providers = dashboard.providers
  const models = dashboard.models
  const collections = dashboard.collections
  const users = dashboard.users
  const billing = dashboard.billing

  const appPlan =
    settingsState.appPlanDraft ?? dashboard.settings.appPlan ?? 'free'
  const globalRateLimit =
    settingsState.globalRateLimitDraft ??
    dashboard.settings.defaultRateLimit ??
    undefined

  const setAppPlan = (value: AppPlan | undefined) =>
    updateSettings({ appPlanDraft: value })
  const setGlobalRateLimit = (value: RateLimitPolicy | undefined) =>
    updateSettings({ globalRateLimitDraft: value })

  const handleSaveSettings = useCallback(() => {
    updateSettings({ isSavingSettings: true })
    return updateAdminSettings({
      appPlan,
      defaultRateLimit: globalRateLimit?.enabled ? globalRateLimit : undefined,
    })
      .then(() => {
        toast.success('Admin settings updated')
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : 'Failed to save settings',
        )
      })
      .finally(() => {
        updateSettings({ isSavingSettings: false })
      })
  }, [appPlan, globalRateLimit, updateAdminSettings])

  const handleStartCheckout = useCallback(() => {
    updateSettings({ isStartingCheckout: true })
    return createProSubscriptionCheckout({
      origin: window.location.origin,
    })
      .then((result) => {
        if (!result.url) {
          throw new Error('Stripe checkout did not return a redirect URL')
        }
        window.location.assign(result.url)
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : 'Failed to start checkout',
        )
      })
      .finally(() => {
        updateSettings({ isStartingCheckout: false })
      })
  }, [createProSubscriptionCheckout])

  const handleOpenBillingPortal = useCallback(() => {
    updateSettings({ isOpeningBillingPortal: true })
    return createBillingPortalSession({
      origin: window.location.origin,
    })
      .then((result) => {
        window.location.assign(result.url)
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : 'Failed to open billing',
        )
      })
      .finally(() => {
        updateSettings({ isOpeningBillingPortal: false })
      })
  }, [createBillingPortalSession])

  const isSavingSettings = settingsState.isSavingSettings
  const isStartingCheckout = settingsState.isStartingCheckout
  const isOpeningBillingPortal = settingsState.isOpeningBillingPortal

  return (
    <Tabs defaultValue="providers" className="grid gap-4">
      <TabsList className="grid w-full grid-cols-5 lg:w-[640px]">
        <TabsTrigger value="providers">Providers</TabsTrigger>
        <TabsTrigger value="models">Models</TabsTrigger>
        <TabsTrigger value="collections">Collections</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="providers" className="grid gap-4">
        <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle>Providers</CardTitle>
            <CardDescription>
              Manage provider credentials, inspect API model catalogs, and apply
              provider-wide limits.
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
                          <p className="text-xs text-muted-foreground">
                            {provider.providerType}
                          </p>
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
                        <Badge
                          variant={provider.isEnabled ? 'default' : 'secondary'}
                        >
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
                        <p>
                          {formatCompactNumber(provider.usage.requests)}{' '}
                          requests
                        </p>
                        <p>
                          {formatCompactNumber(provider.usage.tokens)} tokens
                        </p>
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
                  {discovery.discoveryResult.ok
                    ? 'Discovery succeeded'
                    : 'Discovery failed'}
                </Badge>
                <Badge variant="secondary">
                  {discovery.discoveryResult.providerType}
                </Badge>
                <Badge variant="secondary">
                  {discovery.discoveryResult.modelCount} models
                </Badge>
                {discovery.discoveryResult.ok ? (
                  <Badge variant="secondary">
                    {discovery.selectedDiscoveredCount} selected
                  </Badge>
                ) : null}
                <Badge variant="secondary">
                  {discovery.discoveryResult.source.discoveryMode}
                </Badge>
              </div>

              {discovery.discoveryResult.ok ? (
                <div className="grid gap-4">
                  <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Search and select models to import
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Inspect keeps the full provider catalog available.
                        Search by name, model ID, owner, or capabilities, then
                        import only the models you need.
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
                            (
                              model: ProviderCatalogResult['models'][number],
                            ) => {
                              const isSelected =
                                discovery.selectedDiscoveryModelIds.includes(
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
                                    discovery.toggleDiscoveryModelSelection(
                                      model.modelId,
                                    )
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
                                      <span className="font-medium">
                                        {model.displayName}
                                      </span>
                                      {isImported ? (
                                        <Badge variant="secondary">Added</Badge>
                                      ) : null}
                                      {isSelected ? (
                                        <Badge variant="outline">
                                          Selected
                                        </Badge>
                                      ) : null}
                                    </div>
                                    <p className="truncate font-mono text-xs text-muted-foreground">
                                      {model.modelId}
                                    </p>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                      <span>
                                        Owner: {model.ownedBy || 'Unknown'}
                                      </span>
                                      <span>
                                        Context:{' '}
                                        {model.contextWindow
                                          ? formatTokenCount(
                                              model.contextWindow,
                                            )
                                          : 'n/a'}
                                      </span>
                                      <span>
                                        Max output:{' '}
                                        {model.maxOutputTokens
                                          ? formatTokenCount(
                                              model.maxOutputTokens,
                                            )
                                          : 'n/a'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Modalities:{' '}
                                      {formatModelModalities(model.modalities)}
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
      </TabsContent>

      <TabsContent value="models" className="grid gap-4">
        <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle>Models</CardTitle>
            <CardDescription>
              Show or hide models, set icons per model, and tune custom
              per-model limits.
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
                      <p>
                        {formatCompactNumber(model.usage.requests)} requests
                      </p>
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
      </TabsContent>

      <TabsContent value="collections" className="grid gap-4">
        <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle>Collections</CardTitle>
            <CardDescription>
              Curate reusable groups of existing models without duplicating
              their configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection</TableHead>
                  <TableHead>Models</TableHead>
                  <TableHead>Sort</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.length > 0 ? (
                  collections.map((collection: AdminModelCollection) => {
                    const hiddenModels = collection.models.filter(
                      (model: AdminModelCollection['models'][number]) =>
                        !model.isEnabled,
                    ).length

                    return (
                      <TableRow key={collection._id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{collection.name}</p>
                              <Badge variant="secondary">
                                {collection.modelCount} models
                              </Badge>
                            </div>
                            {collection.description ? (
                              <p className="max-w-xl text-sm text-muted-foreground">
                                {collection.description}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {collection.models
                              .slice(0, 4)
                              .map(
                                (
                                  model: AdminModelCollection['models'][number],
                                ) => (
                                  <Badge
                                    key={model._id}
                                    variant="outline"
                                    className="gap-1.5"
                                  >
                                    <span>{model.displayName}</span>
                                    <span className="text-muted-foreground">
                                      ({model.providerName})
                                    </span>
                                  </Badge>
                                ),
                              )}
                            {collection.modelCount > 4 ? (
                              <Badge variant="outline">
                                +{collection.modelCount - 4} more
                              </Badge>
                            ) : null}
                            {hiddenModels > 0 ? (
                              <Badge variant="secondary">
                                {hiddenModels} hidden
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{collection.sortOrder}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenCollectionDialog(collection)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() =>
                                void deleteModelCollection({ id: collection._id })
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No collections yet. Create one from the current model
                      catalog.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent
        value="usage"
        className="grid gap-4 xl:grid-cols-[1.2fr_1fr]"
      >
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
                    (left: AdminModel, right: AdminModel) =>
                      right.usage.tokens - left.usage.tokens,
                  )
                  .slice(0, 12)
                  .map((model: AdminModel) => (
                    <TableRow key={model._id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{model.displayName}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {model.modelId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCompactNumber(model.usage.requests)}
                      </TableCell>
                      <TableCell>
                        {formatTokenCount(model.usage.tokens)}
                      </TableCell>
                      <TableCell>{model.usage.users}</TableCell>
                      <TableCell>
                        {formatDateTime(model.usage.lastUsedAt)}
                      </TableCell>
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
                {users
                  .slice(0, 12)
                  .map((user: DashboardData['users'][number]) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email || 'No email'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCompactNumber(user.requests)}
                      </TableCell>
                      <TableCell>{formatTokenCount(user.tokens)}</TableCell>
                      <TableCell>{user.models}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent
        value="settings"
        className="grid gap-4 xl:grid-cols-[1fr_0.8fr]"
      >
        <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle>App plan</CardTitle>
            <CardDescription>
              Free mode exposes only free models. Pro mode unlocks paid models
              across the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border border-border bg-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Effective plan</p>
                  <p className="text-sm text-muted-foreground">
                    {billing?.hasActiveSubscription
                      ? 'Stripe billing is currently controlling access.'
                      : 'No active Stripe subscription found. The saved fallback plan will be used.'}
                  </p>
                </div>
                <Badge variant="default">
                  {(billing?.effectiveAppPlan ?? appPlan).toUpperCase()}
                </Badge>
              </div>
              {billing?.status ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Stripe status: {billing.status}
                  {billing.currentPeriodEnd
                    ? ` · renews ${formatDateTime(billing.currentPeriodEnd)}`
                    : ''}
                  {billing.cancelAtPeriodEnd ? ' · cancels at period end' : ''}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <p className="text-sm font-medium text-foreground">
                Saved fallback plan
              </p>
              <p className="text-sm text-muted-foreground">
                This applies when Stripe billing is not active or not
                configured.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={appPlan === 'free' ? 'default' : 'outline'}
                  onClick={() => setAppPlan('free')}
                >
                  Free
                </Button>
                <Button
                  type="button"
                  variant={appPlan === 'pro' ? 'default' : 'outline'}
                  onClick={() => setAppPlan('pro')}
                >
                  Pro
                </Button>
              </div>
            </div>

            <div className="grid gap-2 rounded-xl border border-border bg-muted p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                <p className="font-medium text-foreground">Stripe billing</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Start checkout for the app-wide Pro subscription or open the
                Stripe customer portal for the current billing account.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleStartCheckout()}
                  disabled={
                    isStartingCheckout ||
                    !billing?.priceConfigured ||
                    billing?.hasActiveSubscription
                  }
                >
                  {isStartingCheckout ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 size-4" />
                  )}
                  Upgrade with Stripe
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleOpenBillingPortal()}
                  disabled={
                    isOpeningBillingPortal || !billing?.hasActiveSubscription
                  }
                >
                  {isOpeningBillingPortal ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Settings2 className="mr-2 size-4" />
                  )}
                  Open billing portal
                </Button>
              </div>
              {!billing?.priceConfigured ? (
                <p className="text-xs text-muted-foreground">
                  Set `STRIPE_PRO_PRICE_ID` to enable checkout from this page.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle>Global message policy</CardTitle>
            <CardDescription>
              This limit applies to every message before provider and
              model-specific overrides.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <RateLimitEditor
              label="Default rate limit"
              description="Use this to throttle all model usage, especially custom providers."
              value={globalRateLimit}
              onChange={setGlobalRateLimit}
            />
            <div className="flex justify-end">
              <Button
                onClick={() => void handleSaveSettings()}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Settings2 className="mr-2 size-4" />
                )}
                Save settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CardHeader>
            <CardTitle>Current limit order</CardTitle>
            <CardDescription>
              Requests are checked in this order. The first failed rule blocks
              the send.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border bg-muted p-4">
              <p className="font-medium text-foreground">1. Global default</p>
              <p>
                Applies to all models when enabled. Useful for app-wide per-user
                or global caps.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted p-4">
              <p className="font-medium text-foreground">2. Provider policy</p>
              <p>
                Applies to every model inside a provider, including custom
                OpenAI-compatible endpoints.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted p-4">
              <p className="font-medium text-foreground">3. Model policy</p>
              <p>
                Applies only to the selected model and is the final gate before
                the generation starts.
              </p>
            </div>
            <Separator />
            <p>
              The implementation uses the Convex rate limiter component at
              message send time, so the limits are transactional and enforced
              server-side.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
