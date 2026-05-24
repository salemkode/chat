/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, no-underscore-dangle -- Convex hooks */
import { useAction, useMutation } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Brain, Database, Eye, EyeOff, Loader2, Sparkles, Target } from '@/lib/icons'
import { api } from '@convex/_generated/api'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import {
  AdminEmptyState,
  AdminMiniStat,
  AdminRecord,
  AdminSectionCard,
  AdminStatPill,
  adminChipClass,
  adminInsetClass,
} from '@/components/admin/admin-surface'
import { EntityIcon } from '@/components/admin/entity-icon'
import { formatCompactNumber, getProviderName } from '@/components/admin/admin-utils'
import type { AdminModel, IconType } from '@/components/admin/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InfiniteScrollTrigger } from '@/components/infinite-scroll-trigger'
import { usePaginatedQuery } from '@/lib/convex-query-cache'

type AdminModelsPanelProps = Pick<AdminOutletContext, 'dashboard' | 'onOpenModelDialog'>
type RouterPreference = 'balanced' | 'cost' | 'speed' | 'quality'
type StudioProfile = {
  modelId: string
  autoScore: number
  category:
    | 'Best default'
    | 'Coding'
    | 'Vision'
    | 'Long context'
    | 'Fast'
    | 'Budget'
    | 'Reasoning'
    | 'Needs metadata'
  qualityScore: number
  speedScore: number
  costScore: number
  contextScore: number
  routingTags: string[]
  reasons: string[]
}
type StudioModelRow = {
  model: AdminModel
  profile: StudioProfile | null
}
type StudioSnapshotResult = {
  ok: boolean
  available: boolean
  message: string
  models: StudioProfile[]
}

const preferenceOptions: Array<{
  value: RouterPreference
  label: string
  note: string
  weights: {
    quality: number
    speed: number
    cost: number
    context: number
  }
}> = [
  {
    value: 'balanced',
    label: 'Balanced',
    note: 'Best everyday default for mixed prompts.',
    weights: { quality: 45, speed: 25, cost: 25, context: 18 },
  },
  {
    value: 'quality',
    label: 'Quality',
    note: 'Prefer stronger reasoning and task fit.',
    weights: { quality: 82, speed: 10, cost: 3, context: 26 },
  },
  {
    value: 'speed',
    label: 'Speed',
    note: 'Favor lower latency models.',
    weights: { quality: 20, speed: 60, cost: 15, context: 12 },
  },
  {
    value: 'cost',
    label: 'Cost',
    note: 'Favor cheaper models for routine requests.',
    weights: { quality: 20, speed: 15, cost: 60, context: 10 },
  },
]

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

function isRouterPreference(value: string): value is RouterPreference {
  return preferenceOptions.some((option) => option.value === value)
}

function preferenceOptionFor(value: RouterPreference) {
  return preferenceOptions.find((option) => option.value === value) ?? preferenceOptions[0]
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}</span>
      </div>
      <Progress value={value} className="h-1.5 bg-muted" />
    </div>
  )
}

function RouterWeightPreview({
  label,
  value,
  description,
}: {
  label: string
  value: number
  description: string
}) {
  return (
    <div className={adminInsetClass + ' grid gap-2 p-3'}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className={adminChipClass}>{value}%</span>
      </div>
      <Slider value={[value]} max={100} step={1} disabled />
    </div>
  )
}

function StudioModelRecord({
  row,
  providers,
  onOpenModelDialog,
  onToggle,
  onDelete,
}: {
  row: StudioModelRow
  providers: AdminOutletContext['dashboard']['providers']
  onOpenModelDialog: (model: AdminModel) => void
  onToggle: (model: AdminModel, isEnabled: boolean) => void
  onDelete: (model: AdminModel) => void
}) {
  const { model, profile } = row
  const attachmentBadgeVariant =
    model.attachmentValidationStatus === 'invalid'
      ? 'destructive'
      : model.attachmentValidationStatus === 'pending'
        ? 'secondary'
        : 'default'
  const attachmentSummary =
    model.supportedAttachmentMediaTypes?.join(', ') ||
    model.attachmentValidationMessage ||
    'Inferred from tags'

  return (
    <AdminRecord
      icon={
        <EntityIcon
          icon={model.icon}
          iconType={normalizeIconType(model.iconType)}
          iconUrl={model.iconUrl || model.providerIconUrl}
        />
      }
      title={
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate">{model.displayName}</span>
          <Badge variant="outline">{profile?.category ?? 'Unscored'}</Badge>
        </div>
      }
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{getProviderName(providers, model.providerId)}</Badge>
          <span className="truncate font-mono text-xs">{model.modelId}</span>
        </div>
      }
      badges={
        <Badge variant={attachmentBadgeVariant}>
          file {model.attachmentValidationStatus ?? 'pending'}
        </Badge>
      }
      summary={
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(profile?.routingTags ?? []).map((tag) => (
              <span key={tag} className={adminChipClass}>
                {tag}
              </span>
            ))}
          </div>
          <p>
            {profile ? `${profile.reasons.join(' · ')}. ` : 'Python router scoring unavailable. '}
            {attachmentSummary}.
          </p>
        </div>
      }
      metrics={
        <div className="grid w-full min-w-0 gap-3 sm:min-w-[16rem]">
          <div className="flex flex-wrap gap-2">
            <AdminStatPill label="Auto score" value={String(profile?.autoScore ?? 0)} />
            <AdminStatPill label="Requests" value={formatCompactNumber(model.usage.requests)} />
            <AdminStatPill label="Favorites" value={String(model.favorites)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <ScoreBar label="Quality" value={profile?.qualityScore ?? 0} />
            <ScoreBar label="Speed" value={profile?.speedScore ?? 0} />
            <ScoreBar label="Cost" value={profile?.costScore ?? 0} />
            <ScoreBar label="Context" value={profile?.contextScore ?? 0} />
          </div>
        </div>
      }
      actions={
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex items-center gap-3">
            <Switch
              checked={model.isEnabled}
              onCheckedChange={(checked) => onToggle(model, checked)}
            />
            <span className={adminChipClass}>
              {model.isEnabled ? (
                <>
                  <Eye className="size-3.5" />
                  Shown
                </>
              ) : (
                <>
                  <EyeOff className="size-3.5" />
                  Hidden
                </>
              )}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenModelDialog(model)}>
              Edit tags
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => onDelete(model)}
            >
              Delete
            </Button>
          </div>
        </div>
      }
    />
  )
}

export function AdminModelsPanel({ dashboard, onOpenModelDialog }: AdminModelsPanelProps) {
  const toggleModelEnabled = useMutation(api.admin.toggleModelEnabled)
  const deleteModel = useMutation(api.admin.deleteModel)
  const updateAdminSettings = useMutation(api.admin.updateAdminSettings)
  const verifyAutoModelRouterConnection = useAction(api.admin.verifyAutoModelRouterConnection)
  const syncModelMetadataFromArtificialAnalysis = useAction(
    api.admin.syncModelMetadataFromArtificialAnalysis,
  )
  const getAutoModelStudioSnapshot = useAction(
    (
      api as unknown as {
        admin: {
          getAutoModelStudioSnapshot: unknown
        }
      }
    ).admin.getAutoModelStudioSnapshot as never,
  )
  const providers = dashboard.providers
  const modelsQuery = usePaginatedQuery(api.admin.listAdminModels, {}, { initialNumItems: 50 })
  const models = modelsQuery.results ?? dashboard.models
  const [studioProfiles, setStudioProfiles] = useState<Record<string, StudioProfile>>({})
  const [studioStatus, setStudioStatus] = useState<{
    loading: boolean
    available: boolean
    message: string
  }>({
    loading: false,
    available: false,
    message: 'Router scoring unavailable',
  })
  const [routerEnabled, setRouterEnabled] = useState(
    dashboard.settings.autoModelRoutingEnabled ?? false,
  )
  const [routerUrl, setRouterUrl] = useState(dashboard.settings.autoModelRouterUrl ?? '')
  const [routerApiKey, setRouterApiKey] = useState(dashboard.settings.autoModelRouterApiKey ?? '')
  const [routerPreference, setRouterPreference] = useState<RouterPreference>(
    dashboard.settings.autoModelRouterPreference ?? 'balanced',
  )
  const [artificialAnalysisApiKey, setArtificialAnalysisApiKey] = useState(
    dashboard.settings.artificialAnalysisApiKey ?? '',
  )
  const [isSavingRouter, setIsSavingRouter] = useState(false)
  const [isVerifyingRouter, setIsVerifyingRouter] = useState(false)
  const [isSyncingArtificialAnalysis, setIsSyncingArtificialAnalysis] = useState(false)
  const selectedPreference = preferenceOptionFor(routerPreference)
  const studioRows = useMemo(() => {
    const rows = models.map(
      (model: AdminModel): StudioModelRow => ({
        model,
        profile: studioProfiles[model.modelId] ?? null,
      }),
    )
    const sortedRows: StudioModelRow[] = []
    for (const row of rows) {
      const insertAt = sortedRows.findIndex((candidate) => {
        const candidateScoreDiff =
          (candidate.profile?.autoScore ?? -1) - (row.profile?.autoScore ?? -1)
        if (candidateScoreDiff !== 0) {
          return candidateScoreDiff < 0
        }
        if (candidate.model.isEnabled !== row.model.isEnabled) {
          return Number(candidate.model.isEnabled) < Number(row.model.isEnabled)
        }
        return candidate.model.displayName.localeCompare(row.model.displayName) > 0
      })
      if (insertAt === -1) {
        sortedRows.push(row)
      } else {
        sortedRows.splice(insertAt, 0, row)
      }
    }
    return sortedRows
  }, [models, studioProfiles])
  const visibleRows = studioRows.filter((row) => row.model.isEnabled)
  const bestRow = visibleRows.find((row) => row.profile !== null) ?? null
  const readyRows = studioRows.filter(
    (row) => row.profile !== null && row.profile.category !== 'Needs metadata',
  )
  const productionTaggedRows = studioRows.filter((row) =>
    row.profile?.routingTags.includes('production'),
  )

  useEffect(() => {
    setRouterEnabled(dashboard.settings.autoModelRoutingEnabled ?? false)
    setRouterUrl(dashboard.settings.autoModelRouterUrl ?? '')
    setRouterApiKey(dashboard.settings.autoModelRouterApiKey ?? '')
    setRouterPreference(dashboard.settings.autoModelRouterPreference ?? 'balanced')
    setArtificialAnalysisApiKey(dashboard.settings.artificialAnalysisApiKey ?? '')
  }, [
    dashboard.settings.artificialAnalysisApiKey,
    dashboard.settings.autoModelRouterApiKey,
    dashboard.settings.autoModelRouterPreference,
    dashboard.settings.autoModelRouterUrl,
    dashboard.settings.autoModelRoutingEnabled,
  ])

  useEffect(() => {
    if (
      dashboard.settings.autoModelRoutingEnabled !== true ||
      !dashboard.settings.autoModelRouterUrl?.trim() ||
      !dashboard.settings.autoModelRouterApiKey?.trim()
    ) {
      setStudioProfiles({})
      setStudioStatus({
        loading: false,
        available: false,
        message: 'Configure the Python router to score models.',
      })
      return
    }

    let cancelled = false
    setStudioStatus((current) => ({ ...current, loading: true }))

    void (
      getAutoModelStudioSnapshot({
        preference: routerPreference,
      } as never) as Promise<StudioSnapshotResult>
    )
      .then((result: StudioSnapshotResult) => {
        if (cancelled) {
          return
        }
        const profileMap = Object.fromEntries(
          result.models.map((model: StudioProfile) => [model.modelId, model]),
        ) as Record<string, StudioProfile>
        setStudioProfiles(profileMap)
        setStudioStatus({
          loading: false,
          available: result.ok && result.available,
          message: result.message,
        })
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        setStudioProfiles({})
        setStudioStatus({
          loading: false,
          available: false,
          message: error instanceof Error ? error.message : 'Could not load Python router scores',
        })
      })

    return () => {
      cancelled = true
    }
  }, [
    dashboard.settings.autoModelRouterApiKey,
    dashboard.settings.autoModelRouterUrl,
    dashboard.settings.autoModelRoutingEnabled,
    getAutoModelStudioSnapshot,
    routerPreference,
  ])

  const handleSaveRouter = async () => {
    setIsSavingRouter(true)
    try {
      await updateAdminSettings({
        appPlan: dashboard.settings.appPlan,
        defaultRateLimit: dashboard.settings.defaultRateLimit,
        defaultAuxiliaryModelId: dashboard.settings.defaultAuxiliaryModelId,
        autoModelRoutingEnabled: routerEnabled,
        autoModelRouterUrl: routerUrl.trim() || undefined,
        autoModelRouterApiKey: routerApiKey.trim() || undefined,
        autoModelRouterPreference: routerPreference,
        artificialAnalysisApiKey: artificialAnalysisApiKey.trim() || undefined,
      })
      toast.success('Router controls saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save router controls')
    } finally {
      setIsSavingRouter(false)
    }
  }

  const handleVerifyRouter = async () => {
    setIsVerifyingRouter(true)
    try {
      const check = await verifyAutoModelRouterConnection({
        routerUrl: routerUrl.trim() || undefined,
        routerApiKey: routerApiKey.trim() || undefined,
      })
      if (check.ok) {
        toast.success('Router connection verified')
      } else {
        toast.error(check.message)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify router')
    } finally {
      setIsVerifyingRouter(false)
    }
  }

  const handleSyncArtificialAnalysis = async () => {
    setIsSyncingArtificialAnalysis(true)
    try {
      if (artificialAnalysisApiKey.trim()) {
        await updateAdminSettings({
          appPlan: dashboard.settings.appPlan,
          defaultRateLimit: dashboard.settings.defaultRateLimit,
          defaultAuxiliaryModelId: dashboard.settings.defaultAuxiliaryModelId,
          autoModelRoutingEnabled: routerEnabled,
          autoModelRouterUrl: routerUrl.trim() || undefined,
          autoModelRouterApiKey: routerApiKey.trim() || undefined,
          autoModelRouterPreference: routerPreference,
          artificialAnalysisApiKey: artificialAnalysisApiKey.trim(),
        })
      }

      const result = await syncModelMetadataFromArtificialAnalysis({
        apiKey: artificialAnalysisApiKey.trim() || undefined,
      })
      if (result.ok) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to sync Artificial Analysis metadata',
      )
    } finally {
      setIsSyncingArtificialAnalysis(false)
    }
  }

  return (
    <Tabs defaultValue="studio" className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="grid w-full grid-cols-3 sm:w-fit">
          <TabsTrigger value="studio">Studio</TabsTrigger>
          <TabsTrigger value="router">Router</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap gap-2">
          <span className={adminChipClass}>Python router scores</span>
          <span className={adminChipClass}>
            {readyRows.length}/{models.length} ready
          </span>
          <span className={adminChipClass}>{productionTaggedRows.length} production-ready</span>
        </div>
      </div>

      <TabsContent value="studio" className="mt-0 grid gap-5">
        <section className="grid gap-3 md:grid-cols-4">
          <AdminMiniStat
            label="Best current pick"
            value={
              bestRow?.profile
                ? `${bestRow.model.displayName} · ${bestRow.profile.autoScore}`
                : 'No scored model'
            }
          />
          <AdminMiniStat label="Routable models" value={`${readyRows.length}/${models.length}`} />
          <AdminMiniStat
            label="Auto decisions"
            value={`${dashboard.autoRouting.totalDecisions30d} in 30d`}
          />
          <AdminMiniStat
            label="Router health"
            value={dashboard.autoRouting.available ? 'Ready' : 'Needs setup'}
          />
        </section>

        <AdminSectionCard
          eyebrow="Model Studio"
          title="Auto-selection board"
          description="Sync Artificial Analysis Intelligence Index run cost into model profiles, then let the Python router turn that into explainable Cost scores."
        >
          <div className={`${adminInsetClass} grid gap-4 p-4 md:grid-cols-[1fr_auto]`}>
            <div className="grid gap-2">
              <Label htmlFor="model-studio-aa-api-key">Artificial Analysis API key</Label>
              <Input
                id="model-studio-aa-api-key"
                type="password"
                value={artificialAnalysisApiKey}
                onChange={(event) => setArtificialAnalysisApiKey(event.target.value)}
                placeholder="From artificialanalysis.ai/insights"
              />
              <p className="text-sm text-muted-foreground">
                Uses Cost to Run Artificial Analysis Intelligence Index when available, otherwise
                token pricing from the same catalog.
              </p>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSyncArtificialAnalysis()}
                disabled={isSyncingArtificialAnalysis}
              >
                {isSyncingArtificialAnalysis ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Sync AA cost
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {studioStatus.loading ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{studioStatus.message}</span>
          </div>
          {studioRows.length > 0 ? (
            <div className="grid gap-3">
              {studioRows.map((row: StudioModelRow) => (
                <StudioModelRecord
                  key={row.model._id}
                  row={row}
                  providers={providers}
                  onOpenModelDialog={onOpenModelDialog}
                  onToggle={(target, isEnabled) =>
                    void toggleModelEnabled({ id: target._id, isEnabled })
                  }
                  onDelete={(target) => void deleteModel({ id: target._id })}
                />
              ))}
              <InfiniteScrollTrigger
                hasMore={
                  modelsQuery.status === 'CanLoadMore' || modelsQuery.status === 'LoadingMore'
                }
                isLoadingMore={modelsQuery.status === 'LoadingMore'}
                onLoadMore={() => modelsQuery.loadMore(50)}
                loadingLabel="Loading more models..."
              />
            </div>
          ) : (
            <AdminEmptyState
              title="No models yet"
              description="Add a model, tag its strengths, then let Model Studio score it for Auto routing."
            />
          )}
        </AdminSectionCard>
      </TabsContent>

      <TabsContent value="router" className="mt-0 grid gap-5">
        <AdminSectionCard
          eyebrow="Router control"
          title="Auto model policy"
          description="This is the story Auto follows: filter eligible models, prefer the selected routing style, record every decision, then learn from the history."
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
            <div className={adminInsetClass + ' grid gap-4 p-4'}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">Enable Auto</p>
                  <p className="text-sm text-muted-foreground">Expose Auto in model pickers.</p>
                </div>
                <Switch checked={routerEnabled} onCheckedChange={setRouterEnabled} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model-studio-router-url">Router base URL</Label>
                <Input
                  id="model-studio-router-url"
                  value={routerUrl}
                  onChange={(event) => setRouterUrl(event.target.value)}
                  placeholder="https://router.example.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model-studio-router-key">Router API key</Label>
                <Input
                  id="model-studio-router-key"
                  type="password"
                  value={routerApiKey}
                  onChange={(event) => setRouterApiKey(event.target.value)}
                  placeholder="Bearer token used by Convex"
                />
              </div>

              <div className="grid gap-2">
                <Label>Routing style</Label>
                <Select
                  value={routerPreference}
                  onValueChange={(value) => {
                    if (isRouterPreference(value)) {
                      setRouterPreference(value)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {preferenceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">{selectedPreference.note}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void handleSaveRouter()} disabled={isSavingRouter}>
                  {isSavingRouter ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Save router controls
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handleVerifyRouter()}
                  disabled={isVerifyingRouter}
                >
                  {isVerifyingRouter ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Verify
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <RouterWeightPreview
                label="Quality"
                value={selectedPreference.weights.quality}
                description="Task fit, reasoning, code, vision, and tool signals."
              />
              <RouterWeightPreview
                label="Speed"
                value={selectedPreference.weights.speed}
                description="Names and provider signals that imply low latency."
              />
              <RouterWeightPreview
                label="Cost"
                value={selectedPreference.weights.cost}
                description="Intelligence Index run cost from Artificial Analysis, normalized for the Python router."
              />
              <RouterWeightPreview
                label="Context"
                value={selectedPreference.weights.context}
                description="How much the context window matters for this preset."
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <AdminMiniStat
              label="Availability"
              value={dashboard.autoRouting.available ? 'Ready' : 'Not ready'}
            />
            <AdminMiniStat
              label="30d decisions"
              value={String(dashboard.autoRouting.totalDecisions30d)}
            />
            <AdminMiniStat
              label="30d failures"
              value={String(dashboard.autoRouting.failedDecisions30d)}
            />
            <AdminMiniStat
              label="Top model"
              value={dashboard.autoRouting.topModels[0]?.modelName ?? 'No decisions'}
            />
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          eyebrow="Research view"
          title="Explainable routing path"
          description="Use this when explaining the project: Auto is not magic, it is a visible decision funnel with inputs, scores, and recorded outcomes."
        >
          <div className="grid gap-3 md:grid-cols-4">
            {[
              {
                title: '1. Catalog',
                body: 'Enabled providers and models become candidates.',
                icon: Database,
              },
              {
                title: '2. Signals',
                body: 'Tags, context, files, tools, and prompt shape are normalized.',
                icon: Sparkles,
              },
              {
                title: '3. Score',
                body: 'Quality, speed, cost, and context combine into an Auto score.',
                icon: Target,
              },
              {
                title: '4. Decide',
                body: 'The chosen model and result are stored for review.',
                icon: Brain,
              },
            ].map(({ title, body, icon: Icon }) => (
              <div key={title} className={adminInsetClass + ' p-4'}>
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-border/70 bg-muted/45">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      </TabsContent>

      <TabsContent value="inventory" className="mt-0">
        <AdminSectionCard
          eyebrow="Model catalog"
          title="Inventory"
          description="A compact operational list for visibility, usage, attachment policy, and manual edits."
        >
          {models.length > 0 ? (
            <div className="grid gap-3">
              {studioRows.map((row: StudioModelRow) => (
                <StudioModelRecord
                  key={row.model._id}
                  row={row}
                  providers={providers}
                  onOpenModelDialog={onOpenModelDialog}
                  onToggle={(target, isEnabled) =>
                    void toggleModelEnabled({ id: target._id, isEnabled })
                  }
                  onDelete={(target) => void deleteModel({ id: target._id })}
                />
              ))}
              <InfiniteScrollTrigger
                hasMore={
                  modelsQuery.status === 'CanLoadMore' || modelsQuery.status === 'LoadingMore'
                }
                isLoadingMore={modelsQuery.status === 'LoadingMore'}
                onLoadMore={() => modelsQuery.loadMore(50)}
                loadingLabel="Loading more models..."
              />
            </div>
          ) : (
            <AdminEmptyState
              title="No models yet"
              description="Import or create a model to start shaping visibility, attachment policy, and selector behavior."
            />
          )}
        </AdminSectionCard>
      </TabsContent>
    </Tabs>
  )
}
