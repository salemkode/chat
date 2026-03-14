import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { FunctionReturnType } from 'convex/server'
import { useAction, useConvexAuth, useMutation } from 'convex/react'
import { Doc } from 'convex/_generated/dataModel'
import {
  ArrowLeft,
  Bot,
  Boxes,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCcw,
  Settings2,
  Shield,
  Sparkles,
  Users,
  WandSparkles,
} from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { toast } from 'sonner'
import { api } from '../../convex/_generated/api'
import { IconPickerField } from '@/components/admin/icon-picker-field'
import { EntityIcon } from '@/components/admin/entity-icon'
import {
  RateLimitEditor,
  type RateLimitPolicy,
} from '@/components/admin/rate-limit-editor'
import { AuthRedirect } from '@/components/auth-redirect'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery } from '@/lib/convex-query-cache'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

type DashboardData = FunctionReturnType<typeof api.admin.getDashboardData>
type ProviderCatalogResult = FunctionReturnType<typeof api.admin.inspectProviderCatalog>
type AdminProvider = DashboardData['providers'][number]
type AdminModel = DashboardData['models'][number]
type ProviderType =
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'groq'
  | 'deepseek'
  | 'xai'
  | 'cerebras'
  | 'openai-compatible'
  | 'opencode'
  | 'mistral'
  | 'cohere'
  | 'perplexity'
  | 'fireworks'
  | 'together'
  | 'replicate'
  | 'moonshot'
  | 'qwen'
  | 'stepfun'

type IconType = 'emoji' | 'lucide' | 'upload' | undefined

const PROVIDER_TYPES: Array<{
  value: ProviderType
  label: string
  defaultBaseURL?: string
}> = [
  { value: 'openrouter', label: 'OpenRouter', defaultBaseURL: 'https://openrouter.ai/api/v1' },
  { value: 'openai', label: 'OpenAI', defaultBaseURL: 'https://api.openai.com/v1' },
  { value: 'anthropic', label: 'Anthropic', defaultBaseURL: 'https://api.anthropic.com/v1' },
  { value: 'google', label: 'Google AI Studio', defaultBaseURL: 'https://generativelanguage.googleapis.com/v1beta' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'groq', label: 'Groq', defaultBaseURL: 'https://api.groq.com/openai/v1' },
  { value: 'deepseek', label: 'DeepSeek', defaultBaseURL: 'https://api.deepseek.com' },
  { value: 'xai', label: 'xAI', defaultBaseURL: 'https://api.x.ai/v1' },
  { value: 'cerebras', label: 'Cerebras', defaultBaseURL: 'https://api.cerebras.ai/v1' },
  { value: 'openai-compatible', label: 'OpenAI Compatible' },
  { value: 'opencode', label: 'OpenCode', defaultBaseURL: 'https://api.opencode.ai/v1' },
  { value: 'mistral', label: 'Mistral', defaultBaseURL: 'https://api.mistral.ai/v1' },
  { value: 'cohere', label: 'Cohere', defaultBaseURL: 'https://api.cohere.ai/v1' },
  { value: 'perplexity', label: 'Perplexity', defaultBaseURL: 'https://api.perplexity.ai' },
  { value: 'fireworks', label: 'Fireworks', defaultBaseURL: 'https://api.fireworks.ai/inference/v1' },
  { value: 'together', label: 'Together', defaultBaseURL: 'https://api.together.xyz/v1' },
  { value: 'replicate', label: 'Replicate' },
  { value: 'moonshot', label: 'Moonshot', defaultBaseURL: 'https://api.moonshot.cn/v1' },
  { value: 'qwen', label: 'Qwen', defaultBaseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { value: 'stepfun', label: 'StepFun', defaultBaseURL: 'https://api.stepfun.com/v1' },
] as const

const usageChartConfig = {
  requests: {
    label: 'Requests',
    color: 'hsl(var(--chart-1))',
  },
  tokens: {
    label: 'Tokens',
    color: 'hsl(var(--chart-2))',
  },
}

interface ProviderFormData {
  name: string
  providerType: ProviderType
  apiKey: string
  baseURL: string
  description: string
  isEnabled: boolean
  sortOrder: number
  icon?: string
  iconType?: IconType
  iconId?: string
  organization: string
  project: string
  headersJson: string
  queryParamsJson: string
  rateLimit?: RateLimitPolicy
}

interface ModelFormData {
  modelId: string
  displayName: string
  description: string
  isEnabled: boolean
  isFree: boolean
  sortOrder: number
  providerId: string
  icon?: string
  iconType?: IconType
  iconId?: string
  capabilitiesText: string
  ownedBy: string
  contextWindow: string
  maxOutputTokens: string
  rateLimit?: RateLimitPolicy
}

function defaultBaseURL(providerType: ProviderType) {
  return PROVIDER_TYPES.find((provider) => provider.value === providerType)?.defaultBaseURL ?? ''
}

function createProviderForm(sortOrder = 0): ProviderFormData {
  return {
    name: '',
    providerType: 'openrouter',
    apiKey: '',
    baseURL: defaultBaseURL('openrouter'),
    description: '',
    isEnabled: true,
    sortOrder,
    icon: 'Boxes',
    iconType: 'lucide',
    iconId: undefined,
    organization: '',
    project: '',
    headersJson: '',
    queryParamsJson: '',
    rateLimit: undefined,
  }
}

function createModelForm(providerId = '', sortOrder = 0): ModelFormData {
  return {
    modelId: '',
    displayName: '',
    description: '',
    isEnabled: true,
    isFree: false,
    sortOrder,
    providerId,
    icon: 'Sparkles',
    iconType: 'lucide',
    iconId: undefined,
    capabilitiesText: '',
    ownedBy: '',
    contextWindow: '',
    maxOutputTokens: '',
    rateLimit: undefined,
  }
}

function parseJsonRecord(text: string, label: string) {
  if (!text.trim()) {
    return undefined
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error('Expected an object')
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === 'string' && value.length > 0)
        .map(([key, value]) => [key, value as string]),
    )
  } catch (error) {
    throw new Error(`${label} must be valid JSON object text.`)
  }
}

function safeJsonStringify(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ''
  }

  return JSON.stringify(value, null, 2)
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
}

function formatDateTime(value?: number) {
  if (!value) {
    return 'Never'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value)
}

function formatTokenCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function getProviderName(
  providers: DashboardData['providers'] | undefined,
  providerId: string,
) {
  return (
    providers?.find((provider: AdminProvider) => provider._id === providerId)?.name ??
    'Unknown Provider'
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
  icon: typeof Sparkles
}) {
  return (
    <Card className="border-border/60 bg-card/80">
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

function AdminPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const [isUserReady, setIsUserReady] = useState(false)
  const [providerDialogOpen, setProviderDialogOpen] = useState(false)
  const [modelDialogOpen, setModelDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Doc<'providers'> | null>(null)
  const [editingModel, setEditingModel] = useState<Doc<'models'> | null>(null)
  const [providerIconPreviewUrl, setProviderIconPreviewUrl] = useState<string | undefined>()
  const [modelIconPreviewUrl, setModelIconPreviewUrl] = useState<string | undefined>()
  const [activeDiscoveryProviderId, setActiveDiscoveryProviderId] = useState<string | undefined>()
  const [discoveryResult, setDiscoveryResult] = useState<ProviderCatalogResult | null>(null)
  const [discoveringProviderId, setDiscoveringProviderId] = useState<string | undefined>()
  const [isImportingDiscovery, setIsImportingDiscovery] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [providerForm, setProviderForm] = useState<ProviderFormData>(createProviderForm())
  const [modelForm, setModelForm] = useState<ModelFormData>(createModelForm())
  const [globalRateLimit, setGlobalRateLimit] = useState<RateLimitPolicy | undefined>()

  const ids = {
    providerName: useId(),
    providerType: useId(),
    providerApiKey: useId(),
    providerBaseUrl: useId(),
    modelId: useId(),
    modelDisplayName: useId(),
    modelProvider: useId(),
    modelSortOrder: useId(),
  }

  const isAdmin = useQuery(
    api.admin.isAdmin,
    isAuthenticated && isUserReady ? {} : 'skip',
  )
  const dashboard = useQuery(
    api.admin.getDashboardData,
    isAuthenticated && isUserReady && isAdmin ? {} : 'skip',
  )

  const addProvider = useMutation(api.admin.addProvider)
  const updateProvider = useMutation(api.admin.updateProvider)
  const deleteProvider = useMutation(api.admin.deleteProvider)
  const toggleProviderEnabled = useMutation(api.admin.toggleProviderEnabled)
  const inspectProviderCatalog = useAction(api.admin.inspectProviderCatalog)
  const importDiscoveredModels = useMutation(api.admin.importDiscoveredModels)
  const addModel = useMutation(api.admin.addModel)
  const updateModel = useMutation(api.admin.updateModel)
  const deleteModel = useMutation(api.admin.deleteModel)
  const toggleModelEnabled = useMutation(api.admin.toggleModelEnabled)
  const updateAdminSettings = useMutation(api.admin.updateAdminSettings)
  const generateUploadUrl = useMutation(api.admin.generateUploadUrl)

  useEffect(() => {
    if (!isAuthenticated) {
      setIsUserReady(false)
      return
    }

    let isCancelled = false
    void ensureCurrentUser({})
      .then(() => {
        if (!isCancelled) {
          setIsUserReady(true)
        }
      })
      .catch((error) => {
        console.error('Failed to initialize current user:', error)
      })

    return () => {
      isCancelled = true
    }
  }, [ensureCurrentUser, isAuthenticated])

  useEffect(() => {
    if (!dashboard?.settings) {
      return
    }

    setGlobalRateLimit(dashboard.settings.defaultRateLimit ?? undefined)
  }, [dashboard?.settings])

  const providers: DashboardData['providers'] = dashboard?.providers ?? []
  const models: DashboardData['models'] = dashboard?.models ?? []
  const users: DashboardData['users'] = dashboard?.users ?? []
  const summary = dashboard?.summary

  const defaultProviderId = providers[0]?._id ?? ''
  const nextProviderSortOrder = providers.length
  const nextModelSortOrder = models.length

  const openProviderDialog = (provider?: AdminProvider) => {
    if (provider) {
      setEditingProvider(provider)
      setProviderIconPreviewUrl(provider.iconUrl)
      setProviderForm({
        name: provider.name,
        providerType: provider.providerType as ProviderType,
        apiKey: provider.apiKey,
        baseURL: provider.baseURL ?? defaultBaseURL(provider.providerType as ProviderType),
        description: provider.description ?? '',
        isEnabled: provider.isEnabled,
        sortOrder: provider.sortOrder,
        icon: provider.icon,
        iconType: provider.iconType as IconType,
        iconId: provider.iconId,
        organization: provider.config?.organization ?? '',
        project: provider.config?.project ?? '',
        headersJson: safeJsonStringify(provider.config?.headers),
        queryParamsJson: safeJsonStringify(provider.config?.queryParams),
        rateLimit: provider.rateLimit as RateLimitPolicy | undefined,
      })
    } else {
      setEditingProvider(null)
      setProviderIconPreviewUrl(undefined)
      setProviderForm(createProviderForm(nextProviderSortOrder))
    }

    setProviderDialogOpen(true)
  }

  const openModelDialog = (model?: AdminModel) => {
    if (model) {
      setEditingModel(model)
      setModelIconPreviewUrl(model.iconUrl)
      setModelForm({
        modelId: model.modelId,
        displayName: model.displayName,
        description: model.description ?? '',
        isEnabled: model.isEnabled,
        isFree: model.isFree,
        sortOrder: model.sortOrder,
        providerId: model.providerId,
        icon: model.icon,
        iconType: model.iconType as IconType,
        iconId: model.iconId,
        capabilitiesText: model.capabilities?.join(', ') ?? '',
        ownedBy: model.ownedBy ?? '',
        contextWindow: model.contextWindow ? String(model.contextWindow) : '',
        maxOutputTokens: model.maxOutputTokens ? String(model.maxOutputTokens) : '',
        rateLimit: model.rateLimit as RateLimitPolicy | undefined,
      })
    } else {
      setEditingModel(null)
      setModelIconPreviewUrl(undefined)
      setModelForm(createModelForm(defaultProviderId, nextModelSortOrder))
    }

    setModelDialogOpen(true)
  }

  const uploadIcon = async (file: File) => {
    const uploadUrl = await generateUploadUrl({})
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    const body = (await response.json()) as { storageId: string }
    return body.storageId
  }

  const handleProviderIconUpload = async (file: File) => {
    const storageId = await uploadIcon(file)
    setProviderIconPreviewUrl(URL.createObjectURL(file))
    setProviderForm((current) => ({
      ...current,
      iconType: 'upload',
      iconId: storageId,
      icon: undefined,
    }))
  }

  const handleModelIconUpload = async (file: File) => {
    const storageId = await uploadIcon(file)
    setModelIconPreviewUrl(URL.createObjectURL(file))
    setModelForm((current) => ({
      ...current,
      iconType: 'upload',
      iconId: storageId,
      icon: undefined,
    }))
  }

  const handleSaveProvider = async () => {
    try {
      const headers = parseJsonRecord(providerForm.headersJson, 'Headers')
      const queryParams = parseJsonRecord(providerForm.queryParamsJson, 'Query params')
      const payload = {
        name: providerForm.name.trim(),
        providerType: providerForm.providerType,
        apiKey: providerForm.apiKey.trim(),
        baseURL: providerForm.baseURL.trim() || undefined,
        description: providerForm.description.trim() || undefined,
        isEnabled: providerForm.isEnabled,
        sortOrder: providerForm.sortOrder,
        icon:
          providerForm.iconType === 'upload'
            ? undefined
            : providerForm.icon?.trim() || undefined,
        iconType: providerForm.iconType,
        iconId: providerForm.iconType === 'upload' ? providerForm.iconId : undefined,
        rateLimit: providerForm.rateLimit?.enabled ? providerForm.rateLimit : undefined,
        config:
          providerForm.organization ||
          providerForm.project ||
          headers ||
          queryParams
            ? {
                organization: providerForm.organization.trim() || undefined,
                project: providerForm.project.trim() || undefined,
                headers,
                queryParams,
              }
            : undefined,
      }

      if (editingProvider) {
        await updateProvider({ id: editingProvider._id, ...payload })
        toast.success('Provider updated')
      } else {
        await addProvider(payload)
        toast.success('Provider created')
      }

      setProviderDialogOpen(false)
      setEditingProvider(null)
      setProviderForm(createProviderForm(nextProviderSortOrder))
      setProviderIconPreviewUrl(undefined)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save provider')
    }
  }

  const handleSaveModel = async () => {
    try {
      const capabilities = modelForm.capabilitiesText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      const payload = {
        modelId: modelForm.modelId.trim(),
        displayName: modelForm.displayName.trim(),
        description: modelForm.description.trim() || undefined,
        isEnabled: modelForm.isEnabled,
        isFree: modelForm.isFree,
        sortOrder: modelForm.sortOrder,
        providerId: modelForm.providerId as Doc<'providers'>['_id'],
        icon:
          modelForm.iconType === 'upload'
            ? undefined
            : modelForm.icon?.trim() || undefined,
        iconType: modelForm.iconType,
        iconId: modelForm.iconType === 'upload' ? modelForm.iconId : undefined,
        capabilities: capabilities.length > 0 ? capabilities : undefined,
        ownedBy: modelForm.ownedBy.trim() || undefined,
        contextWindow: modelForm.contextWindow ? Number(modelForm.contextWindow) : undefined,
        maxOutputTokens: modelForm.maxOutputTokens
          ? Number(modelForm.maxOutputTokens)
          : undefined,
        rateLimit: modelForm.rateLimit?.enabled ? modelForm.rateLimit : undefined,
      }

      if (editingModel) {
        await updateModel({ id: editingModel._id, ...payload })
        toast.success('Model updated')
      } else {
        await addModel(payload)
        toast.success('Model created')
      }

      setModelDialogOpen(false)
      setEditingModel(null)
      setModelForm(createModelForm(defaultProviderId, nextModelSortOrder))
      setModelIconPreviewUrl(undefined)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save model')
    }
  }

  const handleInspectProvider = async (provider?: AdminProvider) => {
    const source = provider
      ? {
          providerId: provider._id,
          providerType: provider.providerType as ProviderType,
          apiKey: provider.apiKey,
          baseURL: provider.baseURL ?? undefined,
          config: provider.config,
        }
      : {
          providerId: undefined,
          providerType: providerForm.providerType,
          apiKey: providerForm.apiKey,
          baseURL: providerForm.baseURL || undefined,
          config: {
            organization: providerForm.organization || undefined,
            project: providerForm.project || undefined,
            headers: parseJsonRecord(providerForm.headersJson, 'Headers'),
            queryParams: parseJsonRecord(providerForm.queryParamsJson, 'Query params'),
          },
        }

    if (!source.apiKey) {
      toast.error('Add an API key before inspecting a provider catalog.')
      return
    }

    setDiscoveringProviderId(source.providerId ?? 'draft')
    try {
      const result = await inspectProviderCatalog(source)
      setDiscoveryResult(result)
      setActiveDiscoveryProviderId(source.providerId)
      if (result.ok) {
        toast.success(`Fetched ${result.modelCount} models`)
      } else {
        toast.error(result.error ?? 'Failed to inspect provider')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to inspect provider')
    } finally {
      setDiscoveringProviderId(undefined)
    }
  }

  const handleImportDiscovery = async () => {
    if (!discoveryResult?.ok || !activeDiscoveryProviderId) {
      toast.error('Save the provider first, then import discovered models.')
      return
    }

    setIsImportingDiscovery(true)
    try {
      const result = await importDiscoveredModels({
        providerId: activeDiscoveryProviderId as Doc<'providers'>['_id'],
        models: discoveryResult.models,
        enableImportedModels: true,
      })
      toast.success(`Imported ${result.inserted} new models, updated ${result.updated}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import models')
    } finally {
      setIsImportingDiscovery(false)
    }
  }

  const handleSaveGlobalRateLimit = async () => {
    setIsSavingSettings(true)
    try {
      await updateAdminSettings({
        defaultRateLimit: globalRateLimit?.enabled ? globalRateLimit : undefined,
      })
      toast.success('Admin settings updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const discoveryPreview = useMemo(() => discoveryResult?.models.slice(0, 25) ?? [], [discoveryResult])

  if (isLoading || (isAuthenticated && !isUserReady)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthRedirect />
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_35%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted))/0.35)] text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
        <header className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Button variant="ghost" size="sm" onClick={() => void navigate({ to: '/' })}>
                <ArrowLeft className="mr-2 size-4" />
                Back to chat
              </Button>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                  <Shield className="size-3.5" />
                  Admin control plane
                </div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Model and provider dashboard
                </h1>
                <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
                  Manage provider APIs, sync model catalogs, tune per-model visibility,
                  assign icons, monitor account usage, and apply layered rate limits.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="h-9 px-3">
                {isAdmin ? 'Admin enabled' : 'Admin missing'}
              </Badge>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCcw className="mr-2 size-4" />
                Refresh
              </Button>
              <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openProviderDialog()}>
                    <Plus className="mr-2 size-4" />
                    Add provider
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProvider ? 'Edit provider' : 'Add provider'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure API access, icon handling, discovery settings, and optional
                      provider-level limits.
                    </DialogDescription>
                  </DialogHeader>

                  <ScrollArea className="max-h-[70vh] pr-6">
                    <div className="grid gap-6 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor={ids.providerName}>Name</Label>
                          <Input
                            id={ids.providerName}
                            value={providerForm.name}
                            onChange={(event) =>
                              setProviderForm((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            placeholder="Primary OpenRouter"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={ids.providerType}>Provider type</Label>
                          <Select
                            value={providerForm.providerType}
                            onValueChange={(value) =>
                              setProviderForm((current) => ({
                                ...current,
                                providerType: value as ProviderType,
                                baseURL: editingProvider
                                  ? current.baseURL
                                  : current.baseURL || defaultBaseURL(value as ProviderType),
                              }))
                            }
                          >
                            <SelectTrigger id={ids.providerType}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PROVIDER_TYPES.map((provider) => (
                                <SelectItem key={provider.value} value={provider.value}>
                                  {provider.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2 md:col-span-2">
                          <Label>Description</Label>
                          <Textarea
                            value={providerForm.description}
                            onChange={(event) =>
                              setProviderForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            placeholder="Primary provider used for curated paid models."
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={ids.providerApiKey}>API key</Label>
                          <Input
                            id={ids.providerApiKey}
                            type="password"
                            value={providerForm.apiKey}
                            onChange={(event) =>
                              setProviderForm((current) => ({
                                ...current,
                                apiKey: event.target.value,
                              }))
                            }
                            placeholder="sk-..."
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={ids.providerBaseUrl}>Base URL</Label>
                          <Input
                            id={ids.providerBaseUrl}
                            value={providerForm.baseURL}
                            onChange={(event) =>
                              setProviderForm((current) => ({
                                ...current,
                                baseURL: event.target.value,
                              }))
                            }
                            placeholder="https://api.example.com/v1"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>OpenAI organization</Label>
                          <Input
                            value={providerForm.organization}
                            onChange={(event) =>
                              setProviderForm((current) => ({
                                ...current,
                                organization: event.target.value,
                              }))
                            }
                            placeholder="org_..."
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>OpenAI project</Label>
                          <Input
                            value={providerForm.project}
                            onChange={(event) =>
                              setProviderForm((current) => ({
                                ...current,
                                project: event.target.value,
                              }))
                            }
                            placeholder="proj_..."
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Headers JSON</Label>
                          <Textarea
                            value={providerForm.headersJson}
                            onChange={(event) =>
                              setProviderForm((current) => ({
                                ...current,
                                headersJson: event.target.value,
                              }))
                            }
                            placeholder={'{\n  "HTTP-Referer": "https://example.com"\n}'}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Query params JSON</Label>
                          <Textarea
                            value={providerForm.queryParamsJson}
                            onChange={(event) =>
                              setProviderForm((current) => ({
                                ...current,
                                queryParamsJson: event.target.value,
                              }))
                            }
                            placeholder={'{\n  "api-version": "2024-10-01-preview"\n}'}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Sort order</Label>
                          <Input
                            type="number"
                            value={providerForm.sortOrder}
                            onChange={(event) =>
                              setProviderForm((current) => ({
                                ...current,
                                sortOrder: Number(event.target.value) || 0,
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-6">
                          <Switch
                            checked={providerForm.isEnabled}
                            onCheckedChange={(checked) =>
                              setProviderForm((current) => ({
                                ...current,
                                isEnabled: checked,
                              }))
                            }
                          />
                          <div className="grid gap-1">
                            <Label>Provider enabled</Label>
                            <p className="text-xs text-muted-foreground">
                              Disabled providers stay in admin, but their models disappear from chat.
                            </p>
                          </div>
                        </div>
                      </div>

                      <IconPickerField
                        label="Provider icon"
                        icon={providerForm.icon}
                        iconType={providerForm.iconType}
                        iconId={providerForm.iconId}
                        iconUrl={providerIconPreviewUrl}
                        onChange={(value) =>
                          setProviderForm((current) => ({
                            ...current,
                            icon: value.icon,
                            iconType: value.iconType,
                            iconId: value.iconId,
                          }))
                        }
                        onUpload={handleProviderIconUpload}
                      />

                      <RateLimitEditor
                        label="Provider rate limit"
                        description="Apply limits to every request routed through this provider."
                        value={providerForm.rateLimit}
                        onChange={(value) =>
                          setProviderForm((current) => ({
                            ...current,
                            rateLimit: value,
                          }))
                        }
                      />
                    </div>
                  </ScrollArea>

                  <DialogFooter className="justify-between">
                    <Button
                      variant="outline"
                      onClick={() => void handleInspectProvider()}
                      disabled={discoveringProviderId === 'draft'}
                    >
                      {discoveringProviderId === 'draft' ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <WandSparkles className="mr-2 size-4" />
                      )}
                      Inspect API
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setProviderDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => void handleSaveProvider()}>
                        {editingProvider ? 'Update provider' : 'Create provider'}
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={() => openModelDialog()}>
                    <Plus className="mr-2 size-4" />
                    Add model
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>{editingModel ? 'Edit model' : 'Add model'}</DialogTitle>
                    <DialogDescription>
                      Configure visibility, metadata, icon assignment, and model-level limits.
                    </DialogDescription>
                  </DialogHeader>

                  <ScrollArea className="max-h-[70vh] pr-6">
                    <div className="grid gap-6 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor={ids.modelId}>Model ID</Label>
                          <Input
                            id={ids.modelId}
                            value={modelForm.modelId}
                            onChange={(event) =>
                              setModelForm((current) => ({
                                ...current,
                                modelId: event.target.value,
                              }))
                            }
                            placeholder="openai/gpt-4o"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={ids.modelDisplayName}>Display name</Label>
                          <Input
                            id={ids.modelDisplayName}
                            value={modelForm.displayName}
                            onChange={(event) =>
                              setModelForm((current) => ({
                                ...current,
                                displayName: event.target.value,
                              }))
                            }
                            placeholder="GPT-4o"
                          />
                        </div>

                        <div className="grid gap-2 md:col-span-2">
                          <Label>Description</Label>
                          <Textarea
                            value={modelForm.description}
                            onChange={(event) =>
                              setModelForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            placeholder="Fast multimodal general-purpose model."
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={ids.modelProvider}>Provider</Label>
                          <Select
                            value={modelForm.providerId}
                            onValueChange={(value) =>
                              setModelForm((current) => ({
                                ...current,
                                providerId: value,
                              }))
                            }
                          >
                            <SelectTrigger id={ids.modelProvider}>
                              <SelectValue placeholder="Choose provider" />
                            </SelectTrigger>
                            <SelectContent>
                              {providers.map((provider: AdminProvider) => (
                                <SelectItem key={provider._id} value={provider._id}>
                                  {provider.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={ids.modelSortOrder}>Sort order</Label>
                          <Input
                            id={ids.modelSortOrder}
                            type="number"
                            value={modelForm.sortOrder}
                            onChange={(event) =>
                              setModelForm((current) => ({
                                ...current,
                                sortOrder: Number(event.target.value) || 0,
                              }))
                            }
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Capabilities</Label>
                          <Input
                            value={modelForm.capabilitiesText}
                            onChange={(event) =>
                              setModelForm((current) => ({
                                ...current,
                                capabilitiesText: event.target.value,
                              }))
                            }
                            placeholder="reasoning, vision, code"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Owner</Label>
                          <Input
                            value={modelForm.ownedBy}
                            onChange={(event) =>
                              setModelForm((current) => ({
                                ...current,
                                ownedBy: event.target.value,
                              }))
                            }
                            placeholder="openai"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Context window</Label>
                          <Input
                            type="number"
                            value={modelForm.contextWindow}
                            onChange={(event) =>
                              setModelForm((current) => ({
                                ...current,
                                contextWindow: event.target.value,
                              }))
                            }
                            placeholder="128000"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Max output tokens</Label>
                          <Input
                            type="number"
                            value={modelForm.maxOutputTokens}
                            onChange={(event) =>
                              setModelForm((current) => ({
                                ...current,
                                maxOutputTokens: event.target.value,
                              }))
                            }
                            placeholder="16384"
                          />
                        </div>

                        <div className="flex items-center gap-6 pt-6 md:col-span-2">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={modelForm.isEnabled}
                              onCheckedChange={(checked) =>
                                setModelForm((current) => ({
                                  ...current,
                                  isEnabled: checked,
                                }))
                              }
                            />
                            <Label>Visible in chat</Label>
                          </div>
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={modelForm.isFree}
                              onCheckedChange={(checked) =>
                                setModelForm((current) => ({
                                  ...current,
                                  isFree: Boolean(checked),
                                }))
                              }
                            />
                            <Label>Free tier model</Label>
                          </div>
                        </div>
                      </div>

                      <IconPickerField
                        label="Model icon"
                        icon={modelForm.icon}
                        iconType={modelForm.iconType}
                        iconId={modelForm.iconId}
                        iconUrl={modelIconPreviewUrl}
                        onChange={(value) =>
                          setModelForm((current) => ({
                            ...current,
                            icon: value.icon,
                            iconType: value.iconType,
                            iconId: value.iconId,
                          }))
                        }
                        onUpload={handleModelIconUpload}
                      />

                      <RateLimitEditor
                        label="Model rate limit"
                        description="Apply the strictest limit last, after the global and provider policies."
                        value={modelForm.rateLimit}
                        onChange={(value) =>
                          setModelForm((current) => ({
                            ...current,
                            rateLimit: value,
                          }))
                        }
                      />
                    </div>
                  </ScrollArea>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setModelDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => void handleSaveModel()}>
                      {editingModel ? 'Update model' : 'Create model'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        {!isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Admin access required</CardTitle>
              <CardDescription>
                This user is authenticated but not registered in the `admins` table.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : dashboard === undefined ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="size-8 animate-spin" />
          </div>
        ) : (
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
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Usage trend</CardTitle>
                  <CardDescription>Requests and tokens over the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={usageChartConfig} className="h-[280px] w-full">
                    <AreaChart data={dashboard.usageSeries}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
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

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Top accounts</CardTitle>
                  <CardDescription>Who is using the catalog the most.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {users.slice(0, 5).map((user: DashboardData['users'][number]) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3"
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

            <Tabs defaultValue="providers" className="grid gap-4">
              <TabsList className="grid w-full grid-cols-4 lg:w-[520px]">
                <TabsTrigger value="providers">Providers</TabsTrigger>
                <TabsTrigger value="models">Models</TabsTrigger>
                <TabsTrigger value="usage">Usage</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="providers" className="grid gap-4">
                <Card className="border-border/60">
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
                                <div className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-muted/20">
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
                                <p className="max-w-48 truncate text-destructive">
                                  {provider.lastDiscoveryError}
                                </p>
                              ) : (
                                <p>{provider.lastDiscoveredModelCount ?? 0} models</p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleInspectProvider(provider)}
                                  disabled={discoveringProviderId === provider._id}
                                >
                                  {discoveringProviderId === provider._id ? (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                  ) : (
                                    <WandSparkles className="mr-2 size-4" />
                                  )}
                                  Inspect
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openProviderDialog(provider)}>
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

                {discoveryResult ? (
                  <Card className="border-border/60">
                    <CardHeader>
                      <CardTitle>Provider inspection result</CardTitle>
                      <CardDescription>
                        {discoveryResult.source.endpoint || discoveryResult.source.baseURL || 'Provider discovery'}
                      </CardDescription>
                      <CardAction>
                        {activeDiscoveryProviderId ? (
                          <Button onClick={() => void handleImportDiscovery()} disabled={!discoveryResult.ok || isImportingDiscovery}>
                            {isImportingDiscovery ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                              <Plus className="mr-2 size-4" />
                            )}
                            Import {discoveryResult.modelCount} models
                          </Button>
                        ) : (
                          <Badge variant="secondary">Save provider to import</Badge>
                        )}
                      </CardAction>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <Badge variant={discoveryResult.ok ? 'default' : 'destructive'}>
                          {discoveryResult.ok ? 'Discovery succeeded' : 'Discovery failed'}
                        </Badge>
                        <Badge variant="secondary">{discoveryResult.providerType}</Badge>
                        <Badge variant="secondary">
                          {discoveryResult.modelCount} models
                        </Badge>
                        <Badge variant="secondary">
                          {discoveryResult.source.discoveryMode}
                        </Badge>
                      </div>
                      {discoveryResult.error ? (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                          {discoveryResult.error}
                        </div>
                      ) : null}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Model</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Context</TableHead>
                            <TableHead>Max output</TableHead>
                            <TableHead>Modalities</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {discoveryPreview.map((model: ProviderCatalogResult['models'][number]) => (
                            <TableRow key={model.modelId}>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium">{model.displayName}</p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    {model.modelId}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>{model.ownedBy || 'Unknown'}</TableCell>
                              <TableCell>{model.contextWindow ?? 'n/a'}</TableCell>
                              <TableCell>{model.maxOutputTokens ?? 'n/a'}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {[...(model.modalities?.input ?? []), ...(model.modalities?.output ?? [])]
                                  .filter(Boolean)
                                  .join(', ') || 'n/a'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : null}
              </TabsContent>

              <TabsContent value="models" className="grid gap-4">
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle>Models</CardTitle>
                    <CardDescription>
                      Show or hide models, set icons per model, and tune custom per-model limits.
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
                                <div className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-muted/20">
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
                            <TableCell>{getProviderName(providers, model.providerId)}</TableCell>
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
                                <Badge variant={model.isEnabled ? 'default' : 'secondary'}>
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
                                <Button variant="outline" size="sm" onClick={() => openModelDialog(model)}>
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

              <TabsContent value="usage" className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                <Card className="border-border/60">
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

                <Card className="border-border/60">
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
              </TabsContent>

              <TabsContent value="settings" className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle>Global message policy</CardTitle>
                    <CardDescription>
                      This limit applies to every message before provider and model-specific overrides.
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
                      <Button onClick={() => void handleSaveGlobalRateLimit()} disabled={isSavingSettings}>
                        {isSavingSettings ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Settings2 className="mr-2 size-4" />
                        )}
                        Save admin settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle>Current limit order</CardTitle>
                    <CardDescription>
                      Requests are checked in this order. The first failed rule blocks the send.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm text-muted-foreground">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <p className="font-medium text-foreground">1. Global default</p>
                      <p>
                        Applies to all models when enabled. Useful for app-wide per-user or global caps.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <p className="font-medium text-foreground">2. Provider policy</p>
                      <p>
                        Applies to every model inside a provider, including custom OpenAI-compatible endpoints.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <p className="font-medium text-foreground">3. Model policy</p>
                      <p>
                        Applies only to the selected model and is the final gate before the generation starts.
                      </p>
                    </div>
                    <Separator />
                    <p>
                      The implementation uses the Convex rate limiter component at message send time, so the limits are transactional and enforced server-side.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
