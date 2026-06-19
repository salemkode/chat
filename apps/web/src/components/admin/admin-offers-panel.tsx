/* eslint-disable no-underscore-dangle -- Convex hooks */
import { useCallback, useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { parseConvexIdForTable } from '@chat/core/logic/convex-ids'
import { api } from '@convex/_generated/api'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import {
  AdminEmptyState,
  AdminRecord,
  AdminSectionCard,
  AdminStatPill,
  adminChipClass,
} from '@/components/admin/admin-surface'
import { formatDateTime } from '@/components/admin/admin-utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { InfiniteScrollTrigger } from '@/components/infinite-scroll-trigger'
import { usePaginatedQuery } from '@/lib/convex-query-cache'
import { Loader2, PencilLine, Plus, Trash2 } from '@/lib/icons'
import { toast } from 'sonner'

type OfferKind = 'free_access' | 'availability_window'
type OfferRow = FunctionReturnType<typeof api.admin.listModelOffers>['page'][number]

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function msToDatetimeLocal(ms: number) {
  const d = new Date(ms)
  const y = d.getFullYear()
  const mon = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  const h = pad2(d.getHours())
  const min = pad2(d.getMinutes())
  return `${y}-${mon}-${day}T${h}:${min}`
}

function datetimeLocalToMs(value: string) {
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : Date.now()
}

function parseOfferKind(value: string): OfferKind {
  return value === 'availability_window' ? 'availability_window' : 'free_access'
}

type AdminOffersPanelProps = Pick<AdminOutletContext, 'dashboard'>

export function AdminOffersPanel({ dashboard }: AdminOffersPanelProps) {
  const models = dashboard.models
  const offersQuery = usePaginatedQuery(
    api.admin.listModelOffers,
    {},
    { initialNumItems: 50, customPagination: true },
  )
  const offers = offersQuery.results ?? []

  const createOffer = useMutation(api.admin.createModelOffer)
  const updateOffer = useMutation(api.admin.updateModelOffer)
  const deleteOffer = useMutation(api.admin.deleteModelOffer)

  const modelById = useMemo(() => {
    const modelMap = new Map<string, (typeof models)[number]>()
    for (const model of models) {
      modelMap.set(model._id, model)
    }
    return modelMap
  }, [models])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<OfferRow | null>(null)
  const [saving, setSaving] = useState(false)

  const [formModelId, setFormModelId] = useState<string>('')
  const [formKind, setFormKind] = useState<OfferKind>('free_access')
  const [formStarts, setFormStarts] = useState(() => msToDatetimeLocal(Date.now()))
  const [formEnds, setFormEnds] = useState(() =>
    msToDatetimeLocal(Date.now() + 7 * 24 * 60 * 60 * 1000),
  )
  const [formLabel, setFormLabel] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formEnabled, setFormEnabled] = useState(true)

  const openCreate = () => {
    setEditing(null)
    const now = Date.now()
    setFormModelId(models[0]?._id ?? '')
    setFormKind('free_access')
    setFormStarts(msToDatetimeLocal(now))
    setFormEnds(msToDatetimeLocal(now + 7 * 24 * 60 * 60 * 1000))
    setFormLabel('')
    setFormDescription('')
    setFormEnabled(true)
    setDialogOpen(true)
  }

  const openEdit = (row: OfferRow) => {
    setEditing(row)
    setFormModelId(row.modelId)
    setFormKind(row.kind)
    setFormStarts(msToDatetimeLocal(row.startsAt))
    setFormEnds(msToDatetimeLocal(row.endsAt))
    setFormLabel(row.label ?? '')
    setFormDescription(row.description ?? '')
    setFormEnabled(row.isEnabled)
    setDialogOpen(true)
  }

  const handleSave = useCallback(async () => {
    const normalizedModelId = parseConvexIdForTable('models', formModelId)
    if (!normalizedModelId) {
      toast.error('Choose a model')
      return
    }
    const startsAt = datetimeLocalToMs(formStarts)
    const endsAt = datetimeLocalToMs(formEnds)
    if (startsAt >= endsAt) {
      toast.error('End time must be after start time')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateOffer({
          offerId: editing._id,
          kind: formKind,
          startsAt,
          endsAt,
          label: formLabel.trim() || undefined,
          description: formDescription.trim() || undefined,
          isEnabled: formEnabled,
        })
        toast.success('Offer updated')
      } else {
        await createOffer({
          modelId: normalizedModelId,
          kind: formKind,
          startsAt,
          endsAt,
          label: formLabel.trim() || undefined,
          description: formDescription.trim() || undefined,
          isEnabled: formEnabled,
        })
        toast.success('Offer created')
      }
      setDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [
    createOffer,
    editing,
    formDescription,
    formEnabled,
    formEnds,
    formKind,
    formLabel,
    formModelId,
    formStarts,
    updateOffer,
  ])

  const handleDelete = async (row: OfferRow) => {
    if (!globalThis.confirm('Delete this offer?')) return
    try {
      await deleteOffer({ offerId: row._id })
      toast.success('Offer deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  const setOneWeekPreset = () => {
    const start = datetimeLocalToMs(formStarts)
    setFormEnds(msToDatetimeLocal(start + 7 * 24 * 60 * 60 * 1000))
  }

  const nowMs = Date.now()

  return (
    <div className="grid gap-4">
      <AdminSectionCard
        eyebrow="Promotions"
        title="Model offers"
        description="Time windows for free access or scheduled availability. Offers stay dense and legible so campaign state is easy to track."
        action={
          <Button type="button" onClick={openCreate} disabled={models.length === 0}>
            <Plus className="mr-2 size-4" />
            Add offer
          </Button>
        }
      >
        {offersQuery.results === undefined ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : offers.length === 0 ? (
          <AdminEmptyState
            title="No offers yet"
            description="Create a time-boxed promotion to grant free access or temporarily expose a model only during a specific window."
          />
        ) : (
          <div className="grid gap-3">
            {offers.map((row) => {
              const model = modelById.get(row.modelId)
              const active = row.isEnabled && row.startsAt <= nowMs && row.endsAt >= nowMs
              const status = !row.isEnabled
                ? 'Disabled'
                : active
                  ? 'Active'
                  : row.endsAt < nowMs
                    ? 'Ended'
                    : 'Scheduled'

              return (
                <AdminRecord
                  key={row._id}
                  title={model?.displayName ?? row.modelId}
                  subtitle={model?.modelId ?? row.modelId}
                  badges={
                    <>
                      <Badge variant="secondary">{row.kind}</Badge>
                      <span className={adminChipClass}>{status}</span>
                    </>
                  }
                  summary={row.description || row.label || 'No additional campaign notes provided.'}
                  metrics={
                    <>
                      <AdminStatPill label="Starts" value={formatDateTime(row.startsAt)} />
                      <AdminStatPill label="Ends" value={formatDateTime(row.endsAt)} />
                      <AdminStatPill label="Updated" value={formatDateTime(row.updatedAt)} />
                    </>
                  }
                  actions={
                    <div className="flex flex-wrap gap-1 sm:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(row)}
                        aria-label="Edit offer"
                      >
                        <PencilLine className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleDelete(row)}
                        aria-label="Delete offer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  }
                />
              )
            })}
            <InfiniteScrollTrigger
              hasMore={
                offersQuery.status === 'CanLoadMore' || offersQuery.status === 'LoadingMore'
              }
              isLoadingMore={offersQuery.status === 'LoadingMore'}
              onLoadMore={() => offersQuery.loadMore(50)}
              loadingLabel="Loading more offers..."
            />
          </div>
        )}
      </AdminSectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit offer' : 'New offer'}</DialogTitle>
            <DialogDescription>Changes apply on save. Times use your local timezone.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Model</Label>
              <Select
                value={formModelId}
                onValueChange={setFormModelId}
                disabled={Boolean(editing)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model: (typeof models)[number]) => (
                    <SelectItem key={model._id} value={model._id}>
                      {model.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Kind</Label>
              <Select value={formKind} onValueChange={(value) => setFormKind(parseOfferKind(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_access">free_access</SelectItem>
                  <SelectItem value="availability_window">availability_window</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-starts">Starts</Label>
              <Input
                id="offer-starts"
                type="datetime-local"
                value={formStarts}
                onChange={(event) => setFormStarts(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="offer-ends">Ends</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={setOneWeekPreset}
                >
                  +1 week from start
                </Button>
              </div>
              <Input
                id="offer-ends"
                type="datetime-local"
                value={formEnds}
                onChange={(event) => setFormEnds(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-label">Label (optional)</Label>
              <Input
                id="offer-label"
                value={formLabel}
                onChange={(event) => setFormLabel(event.target.value)}
                placeholder="e.g. GPT-4o free week"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-desc">Description (optional)</Label>
              <Input
                id="offer-desc"
                value={formDescription}
                onChange={(event) => setFormDescription(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="offer-enabled">Enabled</Label>
              <Switch id="offer-enabled" checked={formEnabled} onCheckedChange={setFormEnabled} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
