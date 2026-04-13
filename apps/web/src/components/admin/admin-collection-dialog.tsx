/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- models list matches AdminModel[] at runtime */
import { useMutation } from 'convex/react'
import type { Doc } from '@convex/_generated/dataModel'
import { Plus } from '@/lib/icons'
import { useCallback, useId, useReducer } from 'react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { EntityIcon } from '@/components/admin/entity-icon'
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
import type { AdminModel, AdminModelCollection, IconType } from '@/components/admin/types'
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

export type AdminCollectionDialogProps = {
  state: {
    open: boolean
    onOpenChange: (open: boolean) => void
    form: ModelCollectionFormData
    setForm: (update: StateUpdate<ModelCollectionFormData>) => void
    ids: AdminCollectionFormIds
    editingCollection: AdminModelCollection | null
    models: AdminModel[]
  }
  actions: {
    onTriggerOpen: () => void
    onSave: () => void
  }
}

export function AdminCollectionDialog({ state, actions }: AdminCollectionDialogProps) {
  const {
    open,
    onOpenChange,
    form: collectionForm,
    setForm: setCollectionForm,
    ids,
    editingCollection,
    models,
  } = state

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
              Build a named group from your current models. Collections only reference existing
              models, so any model edits stay in sync automatically.
            </ResponsiveModalDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-6">
            <div className="grid gap-6 py-4">
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
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Models</h3>
                    <p className="text-sm text-muted-foreground">
                      Select from the models already configured in the catalog.
                    </p>
                  </div>
                  <Badge variant="secondary">{collectionForm.modelIds.length} selected</Badge>
                </div>

                <div className="overflow-hidden rounded-xl border border-border">
                  <ScrollArea className="h-[320px]">
                    <div className="grid gap-2 p-3">
                      {models.length > 0 ? (
                        models.map((model: AdminModel) => {
                          const isSelected = collectionForm.modelIds.includes(model._id)

                          return (
                            <label
                              key={model._id}
                              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:bg-muted/40"
                            >
                              <Checkbox
                                checked={isSelected}
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
                                  iconType={model.iconType as IconType}
                                  iconUrl={model.iconUrl || model.providerIconUrl}
                                />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">{model.displayName}</span>
                                  <Badge variant="outline">{model.providerName}</Badge>
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
                              </div>
                            </label>
                          )
                        })
                      ) : (
                        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                          Add models first, then create collections from them here.
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
              {editingCollection ? 'Update collection' : 'Create collection'}
            </Button>
          </DialogFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  )
}

export function useAdminCollectionDialog({ models }: { models: AdminModel[] }) {
  const [dialogState, updateDialog] = useReducer(
    mergeReducer<ModelCollectionDialogState>,
    initialModelCollectionDialogState,
  )
  const addModelCollection = useMutation(api.admin.addModelCollection)
  const updateModelCollection = useMutation(api.admin.updateModelCollection)

  const collectionNameId = useId()
  const collectionSortOrderId = useId()

  const nextCollectionSortOrder = models.length
  const collectionForm = dialogState.form
  const editingCollection = dialogState.editingCollection

  const setModelCollectionDialogOpen = (open: boolean) => updateDialog({ open })
  const setEditingCollection = (editingCollection: AdminModelCollection | null) =>
    updateDialog({ editingCollection })
  const setCollectionForm = (update: StateUpdate<ModelCollectionFormData>) =>
    updateDialog((current) => ({
      ...current,
      form: typeof update === 'function' ? update(current.form) : { ...current.form, ...update },
    }))

  const openCollectionDialog = useCallback(
    (collection?: AdminModelCollection) => {
      if (collection) {
        setEditingCollection(collection)
        setCollectionForm({
          name: collection.name,
          description: collection.description ?? '',
          sortOrder: collection.sortOrder,
          modelIds: collection.modelIds,
        })
      } else {
        setEditingCollection(null)
        setCollectionForm(createModelCollectionForm(nextCollectionSortOrder))
      }
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
      .map((model) => model._id as Doc<'models'>['_id'])
    const payload = {
      name,
      description: collectionForm.description.trim() || undefined,
      sortOrder: collectionForm.sortOrder,
      modelIds: selectedModelIds,
    }
    const request = editingCollection
      ? updateModelCollection({ id: editingCollection._id, ...payload })
      : addModelCollection(payload)
    return request
      .then(() => {
        toast.success(editingCollection ? 'Collection updated' : 'Collection created')
        setModelCollectionDialogOpen(false)
        setEditingCollection(null)
        setCollectionForm(createModelCollectionForm(nextCollectionSortOrder))
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to save collection')
      })
  }, [
    addModelCollection,
    collectionForm.description,
    collectionForm.modelIds,
    collectionForm.name,
    collectionForm.sortOrder,
    editingCollection,
    models,
    nextCollectionSortOrder,
    updateModelCollection,
  ])

  const dialogProps: AdminCollectionDialogProps = {
    state: {
      open: dialogState.open,
      onOpenChange: setModelCollectionDialogOpen,
      form: collectionForm,
      setForm: setCollectionForm,
      ids: {
        collectionName: collectionNameId,
        collectionSortOrder: collectionSortOrderId,
      },
      editingCollection,
      models,
    },
    actions: {
      onTriggerOpen: () => openCollectionDialog(),
      onSave: () => void handleSaveCollection(),
    },
  }

  return { dialogProps, openCollectionDialog }
}
