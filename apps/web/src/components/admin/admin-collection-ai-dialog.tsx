import { useAction, useMutation } from 'convex/react'
import type { Id } from '@convex/_generated/dataModel'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import { parseConvexIdForTable } from '@chat/shared/logic/convex-ids'
import type { AdminCollectionDraft } from '@/components/admin/admin-collection-dialog'
import { formatAdminMutationError } from '@/components/admin/admin-mutation-error'
import { EntityIcon } from '@/components/admin/entity-icon'
import type { AdminModel, IconType } from '@/components/admin/types'
import { Sparkles, Loader2 } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-overlay'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type SuggestedCollectionDraft = AdminCollectionDraft

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

function normalizeIconType(value: string | undefined): IconType {
  if (value === 'brand' || value === 'emoji' || value === 'phosphor' || value === 'upload') {
    return value
  }
  return undefined
}

function pickDefaultModelId(models: AdminModel[], defaultAuxiliaryModelId?: Id<'models'>): string {
  const credentialReadyModels = models.filter((model) => model.hasResolvableProviderApiKey)
  const candidates = credentialReadyModels.length > 0 ? credentialReadyModels : models

  if (
    defaultAuxiliaryModelId &&
    candidates.some((model) => model._id === defaultAuxiliaryModelId)
  ) {
    return defaultAuxiliaryModelId
  }

  const openRouterModel = candidates.find(
    (model) => model.isEnabled && model.providerType === 'openrouter',
  )
  if (openRouterModel) {
    return openRouterModel._id
  }

  const enabledModel = candidates.find((model) => model.isEnabled)
  return enabledModel?._id ?? candidates[0]?._id ?? ''
}

function sortModelsForCollectionPicker(left: AdminModel, right: AdminModel) {
  const leftHasCredentials = left.hasResolvableProviderApiKey ? 0 : 1
  const rightHasCredentials = right.hasResolvableProviderApiKey ? 0 : 1
  if (leftHasCredentials !== rightHasCredentials) {
    return leftHasCredentials - rightHasCredentials
  }
  const leftIsOpenRouter = left.providerType === 'openrouter' ? 0 : 1
  const rightIsOpenRouter = right.providerType === 'openrouter' ? 0 : 1
  if (leftIsOpenRouter !== rightIsOpenRouter) {
    return leftIsOpenRouter - rightIsOpenRouter
  }
  if (left.isEnabled !== right.isEnabled) {
    return Number(right.isEnabled) - Number(left.isEnabled)
  }
  return left.displayName.localeCompare(right.displayName)
}

export function AdminCollectionAiDialog({
  models,
  defaultAuxiliaryModelId,
  onOpenCollectionDraft,
}: {
  models: AdminModel[]
  defaultAuxiliaryModelId?: Id<'models'>
  onOpenCollectionDraft: (draft: AdminCollectionDraft) => void
}) {
  const suggestModelCollections = useAction(api.admin.suggestModelCollections)
  const addModelCollection = useMutation(api.admin.addModelCollection)
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [includeHiddenModels, setIncludeHiddenModels] = useState(true)
  const [selectedModelDocId, setSelectedModelDocId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [approvingDraftIndex, setApprovingDraftIndex] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<SuggestedCollectionDraft[]>([])
  const [modelUsed, setModelUsed] = useState<string | null>(null)

  const selectableModels = useMemo(
    () =>
      [...models]
        .filter((model) => model.hasResolvableProviderApiKey)
        .sort(sortModelsForCollectionPicker),
    [models],
  )

  const modelsMissingCredentials = useMemo(
    () => models.filter((model) => !model.hasResolvableProviderApiKey).length,
    [models],
  )

  const modelsById = useMemo(() => new Map(models.map((model) => [model._id, model])), [models])

  useEffect(() => {
    if (!open || selectableModels.length === 0) {
      return
    }

    setSelectedModelDocId((current) => {
      if (current && selectableModels.some((model) => model._id === current)) {
        return current
      }
      return pickDefaultModelId(selectableModels, defaultAuxiliaryModelId)
    })
  }, [defaultAuxiliaryModelId, open, selectableModels])

  const handleGenerate = async () => {
    const selectedModelId = parseConvexIdForTable('models', selectedModelDocId)
    if (!selectedModelId) {
      toast.error('Select a model before generating collection drafts.')
      return
    }

    setIsGenerating(true)
    try {
      const result = await suggestModelCollections({
        prompt: prompt.trim() || undefined,
        includeHiddenModels,
        modelDocId: selectedModelId,
      })
      setDrafts(
        result.collections.map((collection) => ({
          name: collection.name,
          description: collection.description ?? '',
          icon: collection.icon,
          iconType: normalizeIconType(collection.iconType),
          sortOrder: collection.sortOrder,
          modelIds: [...collection.modelIds],
        })),
      )
      setModelUsed(result.modelUsed)
    } catch (error) {
      toast.error(formatAdminMutationError(error, 'Failed to generate collection drafts'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApproveDraft = async (draft: SuggestedCollectionDraft, index: number) => {
    const modelIds = draft.modelIds
      .map((modelId) => parseConvexIdForTable('models', modelId))
      .filter(isPresent)

    if (modelIds.length === 0) {
      toast.error('This draft has no valid models to save.')
      return
    }

    setApprovingDraftIndex(index)
    try {
      await addModelCollection({
        name: draft.name,
        description: draft.description.trim() || undefined,
        icon: draft.icon,
        iconType: draft.iconType,
        sortOrder: draft.sortOrder,
        modelIds,
      })
      setDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index))
      toast.success(`Approved and saved "${draft.name}"`)
    } catch (error) {
      toast.error(formatAdminMutationError(error, 'Failed to approve draft'))
    } finally {
      setApprovingDraftIndex(null)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Sparkles className="mr-2 size-4" />
        Auto-create with AI
      </Button>
      <ResponsiveModal open={open} onOpenChange={setOpen}>
        <ResponsiveModalContent
          size="wide"
          className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col gap-0 overflow-hidden p-0"
        >
          <ResponsiveModalHeader className="items-start pr-16">
            <div className="min-w-0 space-y-2">
              <ResponsiveModalTitle>Generate collection drafts</ResponsiveModalTitle>
              <ResponsiveModalDescription>
                Pick an OpenRouter model (or any model whose provider has an API key), describe the
                categories you want, and review the drafts before saving them.
              </ResponsiveModalDescription>
            </div>
          </ResponsiveModalHeader>

          <ResponsiveModalBody className="p-0">
            <ScrollArea className="h-full">
              <div className="grid gap-5 px-5 py-4 md:px-6 md:py-5">
                <div className="grid gap-4 rounded-lg border border-border/70 bg-muted/20 p-4">
                  <div className="grid gap-2">
                    <Label htmlFor="collection-ai-model">Model</Label>
                    <Select
                      value={selectedModelDocId || undefined}
                      onValueChange={setSelectedModelDocId}
                      disabled={selectableModels.length === 0}
                    >
                      <SelectTrigger id="collection-ai-model">
                        <SelectValue
                          placeholder={
                            selectableModels.length === 0 ? 'No models available' : 'Select a model'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableModels.map((model) => (
                          <SelectItem key={model._id} value={model._id}>
                            {model.displayName}
                            {!model.isEnabled ? ' (hidden)' : ''} · {model.providerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectableModels.length === 0 ? (
                      <p className="text-xs text-destructive">
                        No models have a configured provider API key. Add keys in Admin → Providers,
                        then reopen this dialog.
                      </p>
                    ) : modelsMissingCredentials > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {modelsMissingCredentials} model
                        {modelsMissingCredentials === 1 ? '' : 's'} hidden because their provider
                        has no API key configured.
                      </p>
                    ) : null}
                    <p className="max-w-3xl text-xs text-muted-foreground">
                      Uses the selected model&apos;s provider credentials. OpenRouter models are
                      listed first. Hidden models can still be included in drafts when the checkbox
                      below is enabled.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="collection-ai-prompt">Goal</Label>
                    <Textarea
                      id="collection-ai-prompt"
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder="Create categories for coding, fast answers, multimodal work, and premium reasoning."
                      className="min-h-28"
                    />
                    <p className="max-w-3xl text-xs text-muted-foreground">
                      The AI sees the current catalog, your prompt, and existing collection names,
                      and it only drafts from models that are not already assigned elsewhere.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-background px-3 py-3 text-sm">
                    <Checkbox
                      checked={includeHiddenModels}
                      onCheckedChange={(checked) => setIncludeHiddenModels(checked === true)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium text-foreground">Include hidden models</p>
                      <p className="text-xs text-muted-foreground">
                        Hidden models can still be part of drafts. They stay hidden in the user
                        picker until enabled.
                      </p>
                    </div>
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => void handleGenerate()}
                      disabled={isGenerating || !selectedModelDocId}
                    >
                      {isGenerating ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 size-4" />
                      )}
                      Generate drafts
                    </Button>
                    {modelUsed ? <Badge variant="secondary">Using {modelUsed}</Badge> : null}
                  </div>
                </div>

                {drafts.length > 0 ? (
                  <div className="grid gap-3">
                    {drafts.map((draft, index) => {
                      const draftModels = draft.modelIds
                        .map((modelId) => modelsById.get(modelId))
                        .filter((model): model is AdminModel => model !== undefined)
                      const hiddenCount = draftModels.filter((model) => !model.isEnabled).length

                      return (
                        <article
                          key={`${draft.name}-${index}`}
                          className="rounded-lg border border-border/70 bg-background p-4"
                        >
                          <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
                                  <EntityIcon
                                    icon={draft.icon}
                                    iconType={draft.iconType}
                                    className="size-5"
                                  />
                                </div>
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-semibold tracking-[-0.02em] text-foreground">
                                      {draft.name}
                                    </h3>
                                    <Badge variant="secondary">{draftModels.length} models</Badge>
                                    {hiddenCount > 0 ? (
                                      <Badge variant="outline">{hiddenCount} hidden</Badge>
                                    ) : null}
                                  </div>
                                  <p className="text-sm leading-6 text-muted-foreground">
                                    {draft.description || 'No description generated.'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {draftModels.slice(0, 6).map((model) => (
                                  <Badge
                                    key={model._id}
                                    variant="outline"
                                    className="max-w-full gap-1.5 whitespace-normal text-left"
                                  >
                                    <span className="min-w-0 truncate">{model.displayName}</span>
                                    <span className="shrink-0 text-muted-foreground">
                                      ({model.providerName})
                                    </span>
                                  </Badge>
                                ))}
                                {draftModels.length > 6 ? (
                                  <Badge variant="outline">+{draftModels.length - 6} more</Badge>
                                ) : null}
                              </div>
                            </div>

                            <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:min-w-[24rem]">
                              <Button
                                onClick={() => void handleApproveDraft(draft, index)}
                                disabled={approvingDraftIndex !== null}
                                className="w-full"
                              >
                                {approvingDraftIndex === index ? (
                                  <Loader2 className="mr-2 size-4 animate-spin" />
                                ) : (
                                  <Sparkles className="mr-2 size-4" />
                                )}
                                Approve and save
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setOpen(false)
                                  onOpenCollectionDraft(draft)
                                }}
                                disabled={approvingDraftIndex !== null}
                                className="w-full"
                              >
                                Review before approving
                              </Button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </ResponsiveModalBody>

          <ResponsiveModalFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  )
}
