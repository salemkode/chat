/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- models list matches AdminModel[] at runtime */
import { useMutation } from 'convex/react'
import { normalizeIconType } from '@chat/core/admin-types'
import { Plus, Search, Sparkles } from '@/lib/icons'
import { useCallback, useId, useMemo, useReducer, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { parseConvexIdForTable } from '@chat/core/logic/convex-ids'
import { EntityIcon } from '@/components/admin/entity-icon'
import { IconPickerField } from '@/components/admin/icon-picker-field'
import type {
  ModelCollectionDialogState,
  ModelCollectionFormData,
  StateUpdate,
} from '@/components/admin/admin-form-state'
import {
  createModelCollectionForm,
  initialModelCollectionDialogState,
  mergeReducer,
} from '@/components/admin/admin-form-state'
import type { AdminModel, AdminModelCollection } from '@/components/admin/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DialogHeader, DialogFooter } from '@/components/ui/dialog'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-overlay'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'

export type AdminCollectionFormIds = {
  collectionName: string
  collectionSortOrder: string
}

export type AdminCollectionDraft = ModelCollectionFormData

export type AdminCollectionDialogProps = {
  state: {
    open: boolean
    onOpenChange: (open: boolean) => void
    form: ModelCollectionFormData
    setForm: (update: StateUpdate<ModelCollectionFormData>) => void
    iconPreviewUrl?: string
    ids: AdminCollectionFormIds
    editingCollection: AdminModelCollection | null
    reviewSource?: 'ai'
    models: AdminModel[]
    collections: AdminModelCollection[]
  }
  actions: {
    onTriggerOpen: () => void
    onSave: () => void
    onIconUpload: (file: File) => Promise<void>
  }
}

export function AdminCollectionDialog({ state, actions }: AdminCollectionDialogProps) {
  const {
    open,
    onOpenChange,
    form: collectionForm,
    setForm: setCollectionForm,
    iconPreviewUrl,
    ids,
    editingCollection,
    reviewSource,
    models,
    collections,
  } = state
  const [modelQuery, setModelQuery] = useState('')
  const [showAvailableOnly, setShowAvailableOnly] = useState(true)

  const assignedCollectionNameByModelId = useMemo(() => {
    const next = new Map<string, string>()
    for (const collection of collections) {
      if (editingCollection && collection._id === editingCollection._id) {
        continue
      }
      for (const modelId of collection.modelIds) {
        next.set(modelId, collection.name)
      }
    }
    return next
  }, [collections, editingCollection])

  const normalizedQuery = modelQuery.trim().toLowerCase()
  const filteredModels = useMemo(
    () =>
      models.filter((model: AdminModel) => {
        const assignedCollectionName = assignedCollectionNameByModelId.get(model._id)
        const matchesAvailability = !showAvailableOnly || assignedCollectionName === undefined
        if (!matchesAvailability) {
          return false
        }
        if (!normalizedQuery) {
          return true
        }
        const haystack = [
          model.displayName,
          model.modelId,
          model.providerName,
          model.description ?? '',
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalizedQuery)
      }),
    [assignedCollectionNameByModelId, models, normalizedQuery, showAvailableOnly],
  )
  const availableModelCount = models.filter(
    (model) => assignedCollectionNameByModelId.get(model._id) === undefined,
  ).length

  return (
    <>
      <Button variant="outline" onClick={() => actions.onTriggerOpen()}>
        <Plus className="mr-2 size-4" />
        Add collection
      </Button>
      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
        <ResponsiveModalContent size="page" className="max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <ResponsiveModalTitle>
              {editingCollection ? 'Edit collection' : 'Add collection'}
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              {reviewSource === 'ai'
                ? 'Review the AI draft, adjust anything you want, then approve it to save the collection.'
                : 'Build a named group from your current models. Collections only reference existing models, so any model edits stay in sync automatically.'}
            </ResponsiveModalDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-6">
            <div className="grid gap-6 py-4">
              {reviewSource === 'ai' ? (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-700">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">AI draft pending approval</p>
                    <p className="text-muted-foreground">
                      Nothing is saved yet. Your final button click here is the approval step.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={ids.collectionName}>Name</Label>
                  <Input
                    id={ids.collectionName}
                    value={collectionForm.name}
                    onChange={(event) =>
                      setCollectionForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Reasoning models"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={ids.collectionSortOrder}>Sort order</Label>
                  <Input
                    id={ids.collectionSortOrder}
                    type="number"
                    value={collectionForm.sortOrder}
                    onChange={(event) =>
                      setCollectionForm((current) => ({
                        ...current,
                        sortOrder: Number(event.target.value) || 0,
                      }))
                    }
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={collectionForm.description}
                    onChange={(event) =>
                      setCollectionForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="A curated set of models for long-form reasoning and coding."
                  />
                </div>

                <div className="md:col-span-2">
                  <IconPickerField
                    label="Collection icon"
                    icon={collectionForm.icon}
                    iconType={collectionForm.iconType}
                    iconId={collectionForm.iconId}
                    iconUrl={iconPreviewUrl}
                    onChange={(value) =>
                      setCollectionForm((current) => ({
                        ...current,
                        icon: value.icon,
                        iconType: value.iconType,
                        iconId: value.iconId,
                      }))
                    }
                    onUpload={actions.onIconUpload}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Models</h3>
                    <p className="text-sm text-muted-foreground">
                      Models can belong to only one collection. Search the catalog, then pick from
                      the unassigned set.
                    </p>
                  </div>
                  <Badge variant="secondary">{collectionForm.modelIds.length} selected</Badge>
                </div>

                <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={modelQuery}
                      onChange={(event) => setModelQuery(event.target.value)}
                      placeholder="Search by model, provider, or ID"
                      className="pl-9"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={showAvailableOnly ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowAvailableOnly((current) => !current)}
                    >
                      {showAvailableOnly ? 'Showing available only' : 'Show available only'}
                    </Button>
                    <Badge variant="outline">{availableModelCount} available</Badge>
                    <Badge variant="outline">
                      {models.length - availableModelCount} already used
                    </Badge>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-border">
                  <ScrollArea className="h-[320px]">
                    <div className="grid gap-2 p-3">
                      {filteredModels.length > 0 ? (
                        filteredModels.map((model: AdminModel) => {
                          const isSelected = collectionForm.modelIds.includes(model._id)
                          const assignedCollectionName = assignedCollectionNameByModelId.get(
                            model._id,
                          )
                          const isUnavailable = assignedCollectionName !== undefined

                          return (
                            <label
                              key={model._id}
                              className={`flex items-start gap-3 rounded-xl border border-border bg-background p-3 transition-colors ${
                                isUnavailable
                                  ? 'cursor-not-allowed opacity-65'
                                  : 'cursor-pointer hover:bg-muted/40'
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                disabled={isUnavailable}
                                onCheckedChange={(checked) =>
                                  setCollectionForm((current) => ({
                                    ...current,
                                    modelIds: checked
                                      ? [...new Set([...current.modelIds, model._id])]
                                      : current.modelIds.filter((modelId) => modelId !== model._id),
                                  }))
                                }
                              />
                              <div className="mt-0.5 flex size-9 items-center justify-center rounded-lg border border-border bg-muted">
                                <EntityIcon
                                  icon={model.icon}
                                  iconType={normalizeIconType(model.iconType)}
                                  iconUrl={model.iconUrl || model.providerIconUrl}
                                />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">{model.displayName}</span>
                                  <Badge variant="outline">{model.providerName}</Badge>
                                  {assignedCollectionName ? (
                                    <Badge variant="secondary">In {assignedCollectionName}</Badge>
                                  ) : (
                                    <Badge variant="secondary">Available</Badge>
                                  )}
                                  {!model.isEnabled ? (
                                    <Badge variant="secondary">Hidden</Badge>
                                  ) : null}
                                </div>
                                <p className="truncate font-mono text-xs text-muted-foreground">
                                  {model.modelId}
                                </p>
                                {model.description ? (
                                  <p className="text-xs text-muted-foreground">
                                    {model.description}
                                  </p>
                                ) : null}
                                {assignedCollectionName ? (
                                  <p className="text-xs text-muted-foreground">
                                    Remove this model from {assignedCollectionName} before adding it
                                    here.
                                  </p>
                                ) : null}
                              </div>
                            </label>
                          )
                        })
                      ) : (
                        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                          {models.length === 0
                            ? 'Add models first, then create collections from them here.'
                            : 'No models match the current search or availability filter.'}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void actions.onSave()}>
              {reviewSource === 'ai'
                ? 'Approve and save'
                : editingCollection
                  ? 'Update collection'
                  : 'Create collection'}
            </Button>
          </DialogFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  )
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

export function useAdminCollectionDialog({
  models,
  collections,
}: {
  models: AdminModel[]
  collections: AdminModelCollection[]
}) {
  const [dialogState, updateDialog] = useReducer(
    mergeReducer<ModelCollectionDialogState>,
    initialModelCollectionDialogState,
  )
  const addModelCollection = useMutation(api.admin.addModelCollection)
  const generateUploadUrl = useMutation(api.admin.generateUploadUrl)
  const updateModelCollection = useMutation(api.admin.updateModelCollection)

  const collectionNameId = useId()
  const collectionSortOrderId = useId()

  const nextCollectionSortOrder = models.length
  const collectionForm = dialogState.form
  const editingCollection = dialogState.editingCollection
  const reviewSource = dialogState.reviewSource

  const setModelCollectionDialogOpen = (open: boolean) => updateDialog({ open })
  const setEditingCollection = (nextEditingCollection: AdminModelCollection | null) =>
    updateDialog({ editingCollection: nextEditingCollection })
  const setCollectionIconPreviewUrl = (iconPreviewUrl: string | undefined) =>
    updateDialog({ iconPreviewUrl })
  const setReviewSource = (nextReviewSource: ModelCollectionDialogState['reviewSource']) =>
    updateDialog({ reviewSource: nextReviewSource })
  const setCollectionForm = (update: StateUpdate<ModelCollectionFormData>) =>
    updateDialog((current) => ({
      ...current,
      form: typeof update === 'function' ? update(current.form) : { ...current.form, ...update },
    }))

  const uploadIcon = useCallback(
    async (file: File) => {
      const uploadUrl = await generateUploadUrl({})
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      const body = await response.json()
      if (
        typeof body === 'object' &&
        body !== null &&
        'storageId' in body &&
        typeof body.storageId === 'string'
      ) {
        return body.storageId
      }
      throw new Error('Upload did not return a storage ID')
    },
    [generateUploadUrl],
  )

  const handleCollectionIconUpload = useCallback(
    async (file: File) => {
      const storageId = await uploadIcon(file)
      setCollectionIconPreviewUrl(URL.createObjectURL(file))
      setCollectionForm((current) => ({
        ...current,
        iconType: 'upload',
        iconId: storageId,
        icon: undefined,
      }))
    },
    [uploadIcon],
  )

  const openCollectionDialog = useCallback(
    (collection?: AdminModelCollection) => {
      if (collection) {
        setEditingCollection(collection)
        setCollectionIconPreviewUrl(collection.iconUrl)
        setReviewSource(undefined)
        setCollectionForm({
          name: collection.name,
          description: collection.description ?? '',
          icon: collection.icon,
          iconType: collection.iconType,
          iconId: collection.iconId,
          sortOrder: collection.sortOrder,
          modelIds: collection.modelIds,
        })
      } else {
        setEditingCollection(null)
        setCollectionIconPreviewUrl(undefined)
        setReviewSource(undefined)
        setCollectionForm(createModelCollectionForm(nextCollectionSortOrder))
      }
      setModelCollectionDialogOpen(true)
    },
    [nextCollectionSortOrder],
  )

  const openCollectionDraft = useCallback(
    (draft: AdminCollectionDraft) => {
      setEditingCollection(null)
      setCollectionIconPreviewUrl(undefined)
      setReviewSource('ai')
      setCollectionForm({
        ...createModelCollectionForm(nextCollectionSortOrder),
        ...draft,
      })
      setModelCollectionDialogOpen(true)
    },
    [nextCollectionSortOrder],
  )

  const handleSaveCollection = useCallback(() => {
    const name = collectionForm.name.trim()
    if (!name) {
      toast.error('Collection name is required')
      return
    }
    const selectedModelIds = models
      .filter((model) => collectionForm.modelIds.includes(model._id))
      .map((model) => parseConvexIdForTable('models', model._id))
      .filter(isPresent)
    const payload = {
      name,
      description: collectionForm.description.trim() || undefined,
      icon: collectionForm.icon,
      iconType: collectionForm.iconType,
      iconId: collectionForm.iconId
        ? (parseConvexIdForTable('_storage', collectionForm.iconId) ?? undefined)
        : undefined,
      sortOrder: collectionForm.sortOrder,
      modelIds: selectedModelIds,
    }
    const editingCollectionId = editingCollection
      ? parseConvexIdForTable('modelCollections', editingCollection._id)
      : undefined
    if (editingCollection && !editingCollectionId) {
      toast.error('Invalid collection ID')
      return
    }

    const request = editingCollectionId
      ? updateModelCollection({ id: editingCollectionId, ...payload })
      : addModelCollection(payload)
    return request
      .then(() => {
        toast.success(
          reviewSource === 'ai'
            ? 'AI draft approved and saved'
            : editingCollection
              ? 'Collection updated'
              : 'Collection created',
        )
        setModelCollectionDialogOpen(false)
        setEditingCollection(null)
        setCollectionIconPreviewUrl(undefined)
        setReviewSource(undefined)
        setCollectionForm(createModelCollectionForm(nextCollectionSortOrder))
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to save collection')
      })
  }, [
    addModelCollection,
    collectionForm.description,
    collectionForm.icon,
    collectionForm.iconId,
    collectionForm.iconType,
    collectionForm.modelIds,
    collectionForm.name,
    collectionForm.sortOrder,
    editingCollection,
    models,
    nextCollectionSortOrder,
    reviewSource,
    updateModelCollection,
  ])

  const dialogProps: AdminCollectionDialogProps = {
    state: {
      open: dialogState.open,
      onOpenChange: setModelCollectionDialogOpen,
      form: collectionForm,
      setForm: setCollectionForm,
      iconPreviewUrl: dialogState.iconPreviewUrl,
      ids: {
        collectionName: collectionNameId,
        collectionSortOrder: collectionSortOrderId,
      },
      editingCollection,
      reviewSource: dialogState.reviewSource,
      models,
      collections,
    },
    actions: {
      onTriggerOpen: () => openCollectionDialog(),
      onSave: () => void handleSaveCollection(),
      onIconUpload: handleCollectionIconUpload,
    },
  }

  return { dialogProps, openCollectionDialog, openCollectionDraft }
}
