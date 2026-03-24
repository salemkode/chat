/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Convex mutation payloads */
import { useMutation } from 'convex/react'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { Loader2, Plus, WandSparkles } from 'lucide-react'
import { useCallback, useId, useReducer } from 'react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { useAdminDiscovery } from '@/components/admin/admin-discovery-context'
import { IconPickerField } from '@/components/admin/icon-picker-field'
import {
  PROVIDER_TYPES,
  defaultBaseURL,
  type ProviderType,
} from '@/components/admin/admin-provider-catalog'
import type {
  ProviderDialogState,
  ProviderFormData,
  StateUpdate,
} from '@/components/admin/admin-form-state'
import {
  createProviderForm,
  initialProviderDialogState,
  mergeReducer,
} from '@/components/admin/admin-form-state'
import { getParsedJsonRecord, safeJsonStringify } from '@/components/admin/admin-json'
import {
  RateLimitEditor,
  type RateLimitPolicy,
} from '@/components/admin/rate-limit-editor'
import type { AdminProvider, IconType } from '@/components/admin/types'
import { Button } from '@/components/ui/button'
import {
  DialogHeader,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-overlay'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'

export type AdminProviderFormIds = {
  providerName: string
  providerType: string
  providerApiKey: string
  providerBaseUrl: string
}

export type AdminProviderDialogProps = {
  state: {
    open: boolean
    onOpenChange: (open: boolean) => void
    form: ProviderFormData
    setForm: (update: StateUpdate<ProviderFormData>) => void
    ids: AdminProviderFormIds
    editingProvider: Doc<'providers'> | null
    iconPreviewUrl: string | undefined
    discoveringProviderId: string | undefined
  }
  actions: {
    onTriggerOpen: () => void
    onInspectDraft: () => void
    onSave: () => void
    onIconUpload: (file: File) => Promise<void>
  }
}

export function AdminProviderDialog({ state, actions }: AdminProviderDialogProps) {
  const {
    open,
    onOpenChange,
    form: providerForm,
    setForm: setProviderForm,
    ids,
    editingProvider,
    iconPreviewUrl: providerIconPreviewUrl,
    discoveringProviderId,
  } = state

  return (
    <>
      <Button onClick={() => actions.onTriggerOpen()}>
        <Plus className="mr-2 size-4" />
        Add provider
      </Button>
      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent size="large" className="max-h-[90vh] max-w-5xl overflow-hidden">
        <DialogHeader>
          <ResponsiveModalTitle>
            {editingProvider ? 'Edit provider' : 'Add provider'}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Configure API access, icon handling, discovery settings, and optional
            provider-level limits.
          </ResponsiveModalDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="py-4">
            <Tabs defaultValue="configuration" className="grid gap-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="icon">Icon</TabsTrigger>
                <TabsTrigger value="limitation">Limitation</TabsTrigger>
              </TabsList>

              <TabsContent value="configuration" className="mt-0">
                <div className="grid gap-4 rounded-2xl bg-muted/10 p-4 md:grid-cols-2">
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
                            : current.baseURL ||
                              defaultBaseURL(value as ProviderType),
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
                      placeholder={
                        '{\n  "HTTP-Referer": "https://example.com"\n}'
                      }
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
                      placeholder={
                        '{\n  "api-version": "2024-10-01-preview"\n}'
                      }
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
                        Disabled providers stay in admin, but their models
                        disappear from chat.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="icon" className="mt-0">
                <div className="rounded-2xl border border-border bg-muted/10 p-4">
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
                    onUpload={actions.onIconUpload}
                  />
                </div>
              </TabsContent>

              <TabsContent value="limitation" className="mt-0">
                <div className="rounded-2xl border border-border bg-muted/10 p-4">
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
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <DialogFooter className="justify-between">
          <Button
            variant="outline"
            onClick={() => void actions.onInspectDraft()}
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void actions.onSave()}>
              {editingProvider ? 'Update provider' : 'Create provider'}
            </Button>
          </div>
        </DialogFooter>
      </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  )
}

export function useAdminProviderDialog({
  providers,
}: {
  providers: AdminProvider[]
}) {
  const discovery = useAdminDiscovery()
  const [dialogState, updateDialog] = useReducer(
    mergeReducer<ProviderDialogState>,
    initialProviderDialogState,
  )
  const addProvider = useMutation(api.admin.addProvider)
  const updateProvider = useMutation(api.admin.updateProvider)
  const generateUploadUrl = useMutation(api.admin.generateUploadUrl)

  const nextProviderSortOrder = providers.length
  const providerForm = dialogState.form
  const editingProvider = dialogState.editingProvider

  const setProviderDialogOpen = (open: boolean) => updateDialog({ open })
  const setEditingProvider = (provider: Doc<'providers'> | null) =>
    updateDialog({ editingProvider: provider })
  const setProviderIconPreviewUrl = (iconPreviewUrl: string | undefined) =>
    updateDialog({ iconPreviewUrl })
  const setProviderForm = (update: StateUpdate<ProviderFormData>) =>
    updateDialog((current) => ({
      ...current,
      form:
        typeof update === 'function'
          ? update(current.form)
          : { ...current.form, ...update },
    }))

  const openProviderDialog = useCallback(
    (provider?: AdminProvider) => {
      if (provider) {
        setEditingProvider(provider)
        setProviderIconPreviewUrl(provider.iconUrl)
        setProviderForm({
          name: provider.name,
          providerType: provider.providerType as ProviderType,
          apiKey: provider.apiKey,
          baseURL:
            provider.baseURL ??
            defaultBaseURL(provider.providerType as ProviderType),
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
    },
    [nextProviderSortOrder],
  )

  const uploadIcon = useCallback(async (file: File) => {
    const uploadUrl = await generateUploadUrl({})
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    const body = (await response.json()) as { storageId: string }
    return body.storageId
  }, [generateUploadUrl])

  const handleProviderIconUpload = useCallback(
    async (file: File) => {
      const storageId = await uploadIcon(file)
      setProviderIconPreviewUrl(URL.createObjectURL(file))
      setProviderForm((current) => ({
        ...current,
        iconType: 'upload',
        iconId: storageId,
        icon: undefined,
      }))
    },
    [uploadIcon],
  )

  const providerNameId = useId()
  const providerTypeId = useId()
  const providerApiKeyId = useId()
  const providerBaseUrlId = useId()

  const handleSaveProvider = useCallback(() => {
    const headersResult = getParsedJsonRecord(
      providerForm.headersJson,
      'Headers',
    )
    if (headersResult.error) {
      toast.error(headersResult.error)
      return
    }
    const queryParamsResult = getParsedJsonRecord(
      providerForm.queryParamsJson,
      'Query params',
    )
    if (queryParamsResult.error) {
      toast.error(queryParamsResult.error)
      return
    }
    const headers = headersResult.value
    const queryParams = queryParamsResult.value
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
      iconId:
        providerForm.iconType === 'upload'
          ? (providerForm.iconId as Id<'_storage'> | undefined)
          : undefined,
      rateLimit: providerForm.rateLimit?.enabled
        ? providerForm.rateLimit
        : undefined,
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
    const request = editingProvider
      ? updateProvider({ id: editingProvider._id, ...payload })
      : addProvider(payload)
    return request
      .then(() => {
        toast.success(editingProvider ? 'Provider updated' : 'Provider created')
        setProviderDialogOpen(false)
        setEditingProvider(null)
        setProviderForm(createProviderForm(nextProviderSortOrder))
        setProviderIconPreviewUrl(undefined)
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : 'Failed to save provider',
        )
      })
  }, [
    addProvider,
    editingProvider,
    nextProviderSortOrder,
    providerForm,
    updateProvider,
  ])

  const dialogProps: AdminProviderDialogProps = {
    state: {
      open: dialogState.open,
      onOpenChange: setProviderDialogOpen,
      form: providerForm,
      setForm: setProviderForm,
      ids: {
        providerName: providerNameId,
        providerType: providerTypeId,
        providerApiKey: providerApiKeyId,
        providerBaseUrl: providerBaseUrlId,
      },
      editingProvider,
      iconPreviewUrl: dialogState.iconPreviewUrl,
      discoveringProviderId: discovery.discoveringProviderId,
    },
    actions: {
      onTriggerOpen: () => openProviderDialog(),
      onInspectDraft: () => void discovery.inspectDraftProvider(providerForm),
      onSave: () => void handleSaveProvider(),
      onIconUpload: handleProviderIconUpload,
    },
  }

  return { dialogProps, openProviderDialog }
}
