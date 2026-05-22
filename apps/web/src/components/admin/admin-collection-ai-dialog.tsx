import { useAction } from 'convex/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { AdminCollectionDraft } from '@/components/admin/admin-collection-dialog'
import { EntityIcon } from '@/components/admin/entity-icon'
import type { AdminModel, IconType } from '@/components/admin/types'
import { Sparkles, Loader2 } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DialogFooter, DialogHeader } from '@/components/ui/dialog'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-overlay'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'

type SuggestedCollectionDraft = AdminCollectionDraft

function normalizeIconType(value: string | undefined): IconType {
  if (value === 'emoji' || value === 'phosphor' || value === 'upload') {
    return value
  }
  return undefined
}

export function AdminCollectionAiDialog({
  models,
  onOpenCollectionDraft,
}: {
  models: AdminModel[]
  onOpenCollectionDraft: (draft: AdminCollectionDraft) => void
}) {
  const suggestModelCollections = useAction(api.admin.suggestModelCollections)
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [includeHiddenModels, setIncludeHiddenModels] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [drafts, setDrafts] = useState<SuggestedCollectionDraft[]>([])
  const [modelUsed, setModelUsed] = useState<string | null>(null)

  const modelsById = useMemo(() => new Map(models.map((model) => [model._id, model])), [models])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await suggestModelCollections({
        prompt: prompt.trim() || undefined,
        includeHiddenModels,
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
      toast.error(error instanceof Error ? error.message : 'Failed to generate collection drafts')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Sparkles className="mr-2 size-4" />
        Auto-create with AI
      </Button>
      <ResponsiveModal open={open} onOpenChange={setOpen}>
        <ResponsiveModalContent size="page" className="max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <ResponsiveModalTitle>Generate collection drafts</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Use the shared background actions model to propose several category-style
              collections from your current catalog. Review a draft in the editor before saving it.
            </ResponsiveModalDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-6">
            <div className="grid gap-6 py-4">
              <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="grid gap-2">
                  <Label htmlFor="collection-ai-prompt">Goal</Label>
                  <Textarea
                    id="collection-ai-prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Create categories for coding, fast answers, multimodal work, and premium reasoning."
                    className="min-h-28"
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI sees the current catalog, your prompt, and existing collection names.
                  </p>
                </div>

                <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-3 text-sm">
                  <Checkbox
                    checked={includeHiddenModels}
                    onCheckedChange={(checked) => setIncludeHiddenModels(checked === true)}
                  />
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">Include hidden models</p>
                    <p className="text-xs text-muted-foreground">
                      Hidden models can still be part of drafts. They stay hidden in the user
                      picker until enabled.
                    </p>
                  </div>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => void handleGenerate()} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
                    Generate drafts
                  </Button>
                  {modelUsed ? (
                    <Badge variant="secondary">Using {modelUsed}</Badge>
                  ) : null}
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
                        className="rounded-xl border border-border/70 bg-background p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/40">
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
                                <Badge key={model._id} variant="outline" className="gap-1.5">
                                  <span>{model.displayName}</span>
                                  <span className="text-muted-foreground">({model.providerName})</span>
                                </Badge>
                              ))}
                              {draftModels.length > 6 ? (
                                <Badge variant="outline">+{draftModels.length - 6} more</Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setOpen(false)
                                onOpenCollectionDraft(draft)
                              }}
                            >
                              Review in editor
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  )
}
