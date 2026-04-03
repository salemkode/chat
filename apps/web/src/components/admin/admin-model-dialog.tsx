/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- catalog model entries come from Convex-inferred ProviderCatalogResult */
import { useMutation } from 'convex/react'
import type { Doc, Id } from '@convex/_generated/dataModel'
import { Loader2, Plus, RefreshCcw, Sparkles } from '@/lib/icons'
import { useCallback, useId, useMemo, useReducer } from 'react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { useAdminDiscovery } from '@/components/admin/admin-discovery-context'
import { IconPickerField } from '@/components/admin/icon-picker-field'
import type {
  ModelDialogState,
  ModelFormData,
  StateUpdate,
} from '@/components/admin/admin-form-state'
import {
  createModelForm,
  initialModelDialogState,
  mergeReducer,
} from '@/components/admin/admin-form-state'
import {
  formatModelModalities,
  getCapabilitiesTextFromModalities,
} from '@/components/admin/admin-utils'
import {
  RateLimitEditor,
  type RateLimitPolicy,
} from '@/components/admin/rate-limit-editor'
import type {
  AdminModel,
  AdminProvider,
  IconType,
  ProviderCatalogResult,
} from '@/components/admin/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'

export type AdminModelFormIds = {
  modelId: string
  modelDisplayName: string
  modelProvider: string
  modelSortOrder: string
}

export type AdminModelDialogProps = {
  state: {
    open: boolean
    onOpenChange: (open: boolean) => void
    form: ModelFormData
    setForm: (update: StateUpdate<ModelFormData>) => void
    ids: AdminModelFormIds
    editingModel: Doc<'models'> | null
    iconPreviewUrl: string | undefined
    providers: AdminProvider[]
    selectedModelProvider: AdminProvider | null
    discoveringProviderId: string | undefined
    hasDiscoveryForSelectedProvider: boolean
    discoveredModelsForSelectedProvider: ProviderCatalogResult['models']
    discoveredModelCountForSelectedProvider: number
  }
  actions: {
    onTriggerOpen: () => void
    onInspectSelectedProvider: () => void
    onApplyDiscoveredModel: (
      model: ProviderCatalogResult['models'][number],
    ) => void
    onResetModelFormToCustom: () => void
    onSave: () => void
    onIconUpload: (file: File) => Promise<void>
  }
}

export function AdminModelDialog({ state, actions }: AdminModelDialogProps) {
  const {
    open,
    onOpenChange,
    form: modelForm,
    setForm: setModelForm,
    ids,
    editingModel,
    iconPreviewUrl: modelIconPreviewUrl,
    providers,
    selectedModelProvider,
    discoveringProviderId,
    hasDiscoveryForSelectedProvider,
    discoveredModelsForSelectedProvider,
    discoveredModelCountForSelectedProvider,
  } = state

  return (
    <>
      <Button variant="outline" onClick={() => actions.onTriggerOpen()}>
        <Plus className="mr-2 size-4" />
        Add model
      </Button>
      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent size="page" className="max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <ResponsiveModalTitle>
            {editingModel ? 'Edit model' : 'Add model'}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Configure visibility, metadata, icon assignment, and model-level
            limits.
          </ResponsiveModalDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="grid gap-6 py-4">
            <div className="grid gap-2 md:max-w-sm">
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

            {!editingModel ? (
              <div className="grid gap-4 rounded-2xl bg-muted/20 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">
                      Choose a model to add
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Search the selected provider catalog or start from a blank
                      custom model. After selection, every option below stays
                      editable.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      selectedModelProvider
                        ? void actions.onInspectSelectedProvider()
                        : undefined
                    }
                    disabled={
                      !selectedModelProvider ||
                      discoveringProviderId === selectedModelProvider._id
                    }
                  >
                    {selectedModelProvider &&
                    discoveringProviderId === selectedModelProvider._id ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="mr-2 size-4" />
                    )}
                    {hasDiscoveryForSelectedProvider
                      ? 'Refresh catalog'
                      : 'Load catalog'}
                  </Button>
                </div>

                <div className="overflow-hidden rounded-xl border border-border/50 bg-background/90">
                  <Command>
                    <CommandInput placeholder="Search models to add" />
                    <CommandList className="max-h-[280px]">
                      <CommandGroup heading="Custom">
                        <CommandItem
                          value="custom blank manual model"
                          onSelect={() => actions.onResetModelFormToCustom()}
                          className="items-start gap-3 py-3"
                        >
                          <div className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-muted/70">
                            <Plus className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                Blank custom model
                              </span>
                              {!modelForm.modelId ? (
                                <Badge variant="secondary">Selected</Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Start from an empty form and configure the model
                              manually.
                            </p>
                          </div>
                        </CommandItem>
                      </CommandGroup>

                      <CommandGroup
                        heading={
                          hasDiscoveryForSelectedProvider
                            ? `Provider catalog (${discoveredModelsForSelectedProvider.length} available)`
                            : 'Provider catalog'
                        }
                      >
                        {discoveredModelsForSelectedProvider.map(
                          (model: ProviderCatalogResult['models'][number]) => (
                            <CommandItem
                              key={model.modelId}
                              value={`${model.displayName} ${model.modelId} ${model.ownedBy ?? ''} ${formatModelModalities(model.modalities)}`}
                              onSelect={() =>
                                actions.onApplyDiscoveredModel(model)
                              }
                              className="items-start gap-3 py-3"
                            >
                              <div className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-muted/70">
                                <Sparkles className="size-4" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {model.displayName}
                                  </span>
                                  {model.modelId === modelForm.modelId ? (
                                    <Badge variant="secondary">Selected</Badge>
                                  ) : null}
                                </div>
                                <p className="truncate font-mono text-xs text-muted-foreground">
                                  {model.modelId}
                                </p>
                              </div>
                            </CommandItem>
                          ),
                        )}
                      </CommandGroup>

                      <CommandEmpty>No matching models.</CommandEmpty>
                    </CommandList>
                  </Command>
                </div>

                <p className="text-xs text-muted-foreground">
                  {!selectedModelProvider
                    ? 'Choose a provider to load and search its available models.'
                    : hasDiscoveryForSelectedProvider
                      ? discoveredModelsForSelectedProvider.length > 0
                        ? `${discoveredModelsForSelectedProvider.length} of ${discoveredModelCountForSelectedProvider} discovered models are not added yet.`
                        : 'All discovered models for this provider are already in the catalog.'
                      : 'Load this provider catalog to search discovered models, or keep using a blank custom model.'}
                </p>
              </div>
            ) : null}

            <Tabs defaultValue="collection" className="grid gap-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="collection">Collection</TabsTrigger>
                <TabsTrigger value="icon">Icon</TabsTrigger>
                <TabsTrigger value="limitation">Limitation</TabsTrigger>
              </TabsList>

              <TabsContent value="collection" className="mt-0">
                <div className="grid gap-4 rounded-2xl bg-muted/10 p-4 md:grid-cols-2">
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
                    <Label>Supports reasoning</Label>
                    <Switch
                      checked={modelForm.supportsReasoning}
                      onCheckedChange={(checked) =>
                        setModelForm((current) => ({
                          ...current,
                          supportsReasoning: checked,
                          defaultReasoningLevel: checked
                            ? current.defaultReasoningLevel === 'off'
                              ? 'medium'
                              : current.defaultReasoningLevel
                            : 'off',
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Default reasoning level</Label>
                    <Select
                      value={modelForm.defaultReasoningLevel}
                      onValueChange={(value) =>
                        setModelForm((current) => ({
                          ...current,
                          defaultReasoningLevel: value as
                            | 'off'
                            | 'low'
                            | 'medium'
                            | 'high',
                        }))
                      }
                      disabled={!modelForm.supportsReasoning}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
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
              </TabsContent>

              <TabsContent value="icon" className="mt-0">
                <div className="rounded-2xl bg-muted/10 p-4">
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
                    onUpload={actions.onIconUpload}
                  />
                </div>
              </TabsContent>

              <TabsContent value="limitation" className="mt-0">
                <div className="grid gap-4 rounded-2xl bg-muted/10 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
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
                  </div>

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
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void actions.onSave()}>
            {editingModel ? 'Update model' : 'Create model'}
          </Button>
        </DialogFooter>
      </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  )
}

export function useAdminModelDialog({
  models,
  providers,
}: {
  models: AdminModel[]
  providers: AdminProvider[]
}) {
  const discovery = useAdminDiscovery()
  const [dialogState, updateDialog] = useReducer(
    mergeReducer<ModelDialogState>,
    initialModelDialogState,
  )
  const addModel = useMutation(api.admin.addModel)
  const updateModel = useMutation(api.admin.updateModel)
  const generateUploadUrl = useMutation(api.admin.generateUploadUrl)

  const modelId = useId()
  const modelDisplayNameId = useId()
  const modelProviderId = useId()
  const modelSortOrderId = useId()

  const defaultProviderId = providers[0]?._id ?? ''
  const nextModelSortOrder = models.length
  const modelForm = dialogState.form
  const editingModel = dialogState.editingModel

  const setModelDialogOpen = (open: boolean) => updateDialog({ open })
  const setEditingModel = (model: Doc<'models'> | null) =>
    updateDialog({ editingModel: model })
  const setModelIconPreviewUrl = (iconPreviewUrl: string | undefined) =>
    updateDialog({ iconPreviewUrl })
  const setModelForm = (update: StateUpdate<ModelFormData>) =>
    updateDialog((current) => ({
      ...current,
      form:
        typeof update === 'function'
          ? update(current.form)
          : { ...current.form, ...update },
    }))

  const selectedModelProvider =
    providers.find((provider) => provider._id === modelForm.providerId) ?? null

  const hasDiscoveryForSelectedProvider =
    discovery.discoveryResult?.ok &&
    discovery.activeDiscoveryProviderId === modelForm.providerId

  const discoveredModelsForSelectedProvider = useMemo(() => {
    if (!hasDiscoveryForSelectedProvider || !discovery.discoveryResult) {
      return []
    }
    const existingModelIds = new Set(
      models
        .filter((model: AdminModel) => model.providerId === modelForm.providerId)
        .map((model: AdminModel) => model.modelId),
    )
    return discovery.discoveryResult.models.filter(
      (model: ProviderCatalogResult['models'][number]) =>
        !existingModelIds.has(model.modelId),
    )
  }, [
    discovery.discoveryResult,
    hasDiscoveryForSelectedProvider,
    modelForm.providerId,
    models,
  ])

  const discoveredModelCountForSelectedProvider =
    hasDiscoveryForSelectedProvider
      ? (discovery.discoveryResult?.modelCount ?? 0)
      : 0

  const openModelDialog = useCallback(
    (model?: AdminModel) => {
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
          supportsReasoning: Boolean(model.supportsReasoning),
          reasoningLevels:
            (model.reasoningLevels as
              | Array<'low' | 'medium' | 'high'>
              | undefined) ?? ['low', 'medium', 'high'],
          defaultReasoningLevel:
            (model.defaultReasoningLevel as
              | 'off'
              | 'low'
              | 'medium'
              | 'high'
              | undefined) ?? 'off',
          ownedBy: model.ownedBy ?? '',
          contextWindow: model.contextWindow
            ? String(model.contextWindow)
            : '',
          maxOutputTokens: model.maxOutputTokens
            ? String(model.maxOutputTokens)
            : '',
          rateLimit: model.rateLimit as RateLimitPolicy | undefined,
        })
      } else {
        setEditingModel(null)
        setModelIconPreviewUrl(undefined)
        setModelForm(createModelForm(defaultProviderId, nextModelSortOrder))
      }
      setModelDialogOpen(true)
    },
    [defaultProviderId, nextModelSortOrder],
  )

  const applyDiscoveredModelToForm = useCallback(
    (discoveredModel: ProviderCatalogResult['models'][number]) => {
      const providerId = modelForm.providerId || defaultProviderId
      const capabilitiesText = getCapabilitiesTextFromModalities(
        discoveredModel.modalities,
      )
      setModelIconPreviewUrl(undefined)
      setModelForm((current) => ({
        ...createModelForm(providerId, current.sortOrder || nextModelSortOrder),
        providerId,
        sortOrder: current.sortOrder || nextModelSortOrder,
        modelId: discoveredModel.modelId,
        displayName: discoveredModel.displayName,
        description: discoveredModel.description ?? '',
        ownedBy: discoveredModel.ownedBy ?? '',
        contextWindow: discoveredModel.contextWindow
          ? String(discoveredModel.contextWindow)
          : '',
        maxOutputTokens: discoveredModel.maxOutputTokens
          ? String(discoveredModel.maxOutputTokens)
          : '',
        capabilitiesText,
        supportsReasoning: capabilitiesText
          .split(',')
          .map((value) => value.trim().toLowerCase())
          .includes('reasoning'),
        defaultReasoningLevel: capabilitiesText
          .split(',')
          .map((value) => value.trim().toLowerCase())
          .includes('reasoning')
          ? 'medium'
          : 'off',
      }))
    },
    [defaultProviderId, modelForm.providerId, nextModelSortOrder],
  )

  const resetModelFormToCustom = useCallback(() => {
    const providerId = modelForm.providerId || defaultProviderId
    setModelIconPreviewUrl(undefined)
    setModelForm((current) => ({
      ...createModelForm(providerId, current.sortOrder || nextModelSortOrder),
      providerId,
      sortOrder: current.sortOrder || nextModelSortOrder,
    }))
  }, [defaultProviderId, modelForm.providerId, nextModelSortOrder])

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

  const handleModelIconUpload = useCallback(
    async (file: File) => {
      const storageId = await uploadIcon(file)
      setModelIconPreviewUrl(URL.createObjectURL(file))
      setModelForm((current) => ({
        ...current,
        iconType: 'upload',
        iconId: storageId,
        icon: undefined,
      }))
    },
    [uploadIcon],
  )

  const handleSaveModel = useCallback(() => {
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
      iconId:
        modelForm.iconType === 'upload'
          ? (modelForm.iconId as Id<'_storage'> | undefined)
          : undefined,
      capabilities: capabilities.length > 0 ? capabilities : undefined,
      supportsReasoning: modelForm.supportsReasoning,
      reasoningLevels: modelForm.supportsReasoning
        ? modelForm.reasoningLevels
        : undefined,
      defaultReasoningLevel: modelForm.supportsReasoning
        ? modelForm.defaultReasoningLevel
        : 'off',
      ownedBy: modelForm.ownedBy.trim() || undefined,
      contextWindow: modelForm.contextWindow
        ? Number(modelForm.contextWindow)
        : undefined,
      maxOutputTokens: modelForm.maxOutputTokens
        ? Number(modelForm.maxOutputTokens)
        : undefined,
      rateLimit: modelForm.rateLimit?.enabled ? modelForm.rateLimit : undefined,
    }
    const request = editingModel
      ? updateModel({ id: editingModel._id, ...payload })
      : addModel(payload)
    return request
      .then(() => {
        toast.success(editingModel ? 'Model updated' : 'Model created')
        setModelDialogOpen(false)
        setEditingModel(null)
        setModelForm(createModelForm(defaultProviderId, nextModelSortOrder))
        setModelIconPreviewUrl(undefined)
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : 'Failed to save model',
        )
      })
  }, [
    addModel,
    defaultProviderId,
    editingModel,
    modelForm,
    nextModelSortOrder,
    updateModel,
  ])

  const dialogProps: AdminModelDialogProps = {
    state: {
      open: dialogState.open,
      onOpenChange: setModelDialogOpen,
      form: modelForm,
      setForm: setModelForm,
      ids: {
        modelId,
        modelDisplayName: modelDisplayNameId,
        modelProvider: modelProviderId,
        modelSortOrder: modelSortOrderId,
      },
      editingModel,
      iconPreviewUrl: dialogState.iconPreviewUrl,
      providers,
      selectedModelProvider,
      discoveringProviderId: discovery.discoveringProviderId,
      hasDiscoveryForSelectedProvider,
      discoveredModelsForSelectedProvider,
      discoveredModelCountForSelectedProvider,
    },
    actions: {
      onTriggerOpen: () => openModelDialog(),
      onInspectSelectedProvider: () => {
        if (selectedModelProvider) {
          void discovery.inspectSavedProvider(selectedModelProvider)
        }
      },
      onApplyDiscoveredModel: applyDiscoveredModelToForm,
      onResetModelFormToCustom: resetModelFormToCustom,
      onSave: () => void handleSaveModel(),
      onIconUpload: handleModelIconUpload,
    },
  }

  return { dialogProps, openModelDialog }
}
