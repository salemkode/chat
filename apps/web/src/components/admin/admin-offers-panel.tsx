import { useCallback, useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { AdminOutletContext } from '@/components/admin/admin-outlet-context'
import { formatDateTime } from '@/components/admin/admin-utils'
import type { AdminModel } from '@/components/admin/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useQuery } from '@/lib/convex-query-cache'
import { Loader2, PencilLine, Plus, Trash2 } from '@/lib/icons'
import { toast } from 'sonner'

type OfferRow = {
  _id: Id<'modelOffers'>
  _creationTime: number
  modelId: Id<'models'>
  kind: 'free_access' | 'availability_window'
  startsAt: number
  endsAt: number
  label?: string
  description?: string
  isEnabled: boolean
  updatedAt: number
}

function msToDatetimeLocal(ms: number) {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const mon = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${y}-${mon}-${day}T${h}:${min}`
}

function datetimeLocalToMs(value: string) {
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : Date.now()
}

type AdminOffersPanelProps = Pick<AdminOutletContext, 'dashboard'>

export function AdminOffersPanel({ dashboard }: AdminOffersPanelProps) {
  const models = dashboard.models as AdminModel[]
  const offers = useQuery(api.admin.listModelOffers, {}) as OfferRow[] | undefined

  const createOffer = useMutation(api.admin.createModelOffer)
  const updateOffer = useMutation(api.admin.updateModelOffer)
  const deleteOffer = useMutation(api.admin.deleteModelOffer)

  const modelById = useMemo(() => {
    const m = new Map<string, AdminModel>()
    for (const model of models) {
      m.set(model._id, model)
    }
    return m
  }, [models])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<OfferRow | null>(null)
  const [saving, setSaving] = useState(false)

  const [formModelId, setFormModelId] = useState<string>('')
  const [formKind, setFormKind] = useState<'free_access' | 'availability_window'>('free_access')
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
    if (!formModelId) {
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
          modelId: formModelId as Id<'models'>,
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [
    createOffer,
    updateOffer,
    editing,
    formDescription,
    formEnabled,
    formEnds,
    formKind,
    formLabel,
    formModelId,
    formStarts,
  ])

  const handleDelete = async (row: OfferRow) => {
    if (!globalThis.confirm('Delete this offer?')) return
    try {
      await deleteOffer({ offerId: row._id })
      toast.success('Offer deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const setOneWeekPreset = () => {
    const start = datetimeLocalToMs(formStarts)
    setFormEnds(msToDatetimeLocal(start + 7 * 24 * 60 * 60 * 1000))
  }

  const nowMs = Date.now()

  return (
    <div className="grid gap-4">
      <Card className="border-border bg-card shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Model offers</CardTitle>
            <CardDescription>
              Time windows for <span className="font-medium">free access</span> (free-tier users can
              use paid models) or <span className="font-medium">availability</span> (model only
              appears while the window is active).
            </CardDescription>
          </div>
          <Button type="button" onClick={openCreate} disabled={models.length === 0}>
            <Plus className="mr-2 size-4" />
            Add offer
          </Button>
        </CardHeader>
        <CardContent>
          {offers === undefined ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : offers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No offers yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((row) => {
                  const model = modelById.get(row.modelId)
                  const active = row.isEnabled && row.startsAt <= nowMs && row.endsAt >= nowMs
                  return (
                    <TableRow key={row._id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{model?.displayName ?? row.modelId}</p>
                          {row.label ? (
                            <p className="text-xs text-muted-foreground">{row.label}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.kind}</TableCell>
                      <TableCell className="text-sm">
                        <div>{formatDateTime(row.startsAt)}</div>
                        <div className="text-muted-foreground">→ {formatDateTime(row.endsAt)}</div>
                      </TableCell>
                      <TableCell>
                        {!row.isEnabled ? (
                          <span className="text-muted-foreground">Disabled</span>
                        ) : active ? (
                          <span className="text-foreground">Active</span>
                        ) : row.endsAt < nowMs ? (
                          <span className="text-muted-foreground">Ended</span>
                        ) : (
                          <span className="text-muted-foreground">Scheduled</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit offer' : 'New offer'}</DialogTitle>
            <DialogDescription>
              Changes apply on save. Times use your local timezone.
            </DialogDescription>
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
                  {models.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Kind</Label>
              <Select
                value={formKind}
                onValueChange={(v) => setFormKind(v as 'free_access' | 'availability_window')}
              >
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
                onChange={(e) => setFormStarts(e.target.value)}
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
                onChange={(e) => setFormEnds(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-label">Label (optional)</Label>
              <Input
                id="offer-label"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="e.g. GPT-4o free week"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offer-desc">Description (optional)</Label>
              <Input
                id="offer-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
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
