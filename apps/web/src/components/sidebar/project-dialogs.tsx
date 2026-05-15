'use client'

import {
  CircleDollarSign,
  Folder,
  GraduationCap,
  Lightbulb,
  NotebookPen,
  Plane,
  X,
} from '@/lib/icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DialogHeader } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-overlay'
import { useI18n } from '@/components/i18n-provider'

export type ProjectDraftState = {
  name: string
  description: string
}

export type RemoveFromProjectState = {
  projectName: string
  threadId: string
  threadTitle: string
}

const PROJECT_TEMPLATE_OPTIONS = [
  {
    translationKey: 'project.template.investing',
    icon: CircleDollarSign,
    className: 'text-emerald-300',
  },
  {
    translationKey: 'project.template.homework',
    icon: GraduationCap,
    className: 'text-sky-300',
  },
  {
    translationKey: 'project.template.writing',
    icon: NotebookPen,
    className: 'text-violet-300',
  },
  {
    translationKey: 'project.template.travel',
    icon: Plane,
    className: 'text-amber-300',
  },
] as const

interface ProjectCreateDialogProps {
  open: boolean
  isOnline: boolean
  draft: ProjectDraftState | null
  onOpenChange: (open: boolean) => void
  onDraftChange: (updater: (current: ProjectDraftState | null) => ProjectDraftState | null) => void
  onSave: () => void
}

export function ProjectCreateDialog({
  open,
  isOnline,
  draft,
  onOpenChange,
  onDraftChange,
  onSave,
}: ProjectCreateDialogProps) {
  const { t } = useI18n()

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        size="page"
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-[1.75rem] border border-border bg-card p-0 text-card-foreground"
      >
        <DialogHeader className="border-b border-border bg-muted/20 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <ResponsiveModalTitle className="text-[1.45rem] font-semibold tracking-tight text-foreground">
                {t('project.create')}
              </ResponsiveModalTitle>
              <p className="text-sm text-muted-foreground">
                {t('project.createDescription')}
              </p>
            </div>
            <ResponsiveModalClose asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full"
                aria-label={t('project.dialog.close')}
              >
                <X className="size-4" />
              </Button>
            </ResponsiveModalClose>
          </div>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t('project.name')}</Label>
            <div className="relative">
              <Folder className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draft?.name || ''}
                onChange={(event) =>
                  onDraftChange((current) =>
                    current
                      ? {
                          ...current,
                          name: event.target.value,
                        }
                      : current,
                  )
                }
                placeholder={t('project.namePlaceholder')}
                className="h-11 rounded-2xl border-border bg-background pl-10"
              />
            </div>
          </div>

          {draft ? (
            <div className="flex flex-wrap gap-2">
              {PROJECT_TEMPLATE_OPTIONS.map((option) => {
                const Icon = option.icon

                return (
                  <Button
                    key={option.translationKey}
                    type="button"
                    variant="outline"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() =>
                      onDraftChange((current) =>
                        current
                          ? {
                              ...current,
                              name: current.name || t(option.translationKey),
                            }
                          : current,
                      )
                    }
                  >
                    <Icon className={cn('size-4', option.className)} />
                    {t(option.translationKey)}
                  </Button>
                )
              })}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t('project.description')}</Label>
            <Textarea
              value={draft?.description || ''}
              onChange={(event) =>
                onDraftChange((current) =>
                  current
                    ? {
                        ...current,
                        description: event.target.value,
                      }
                    : current,
                )
              }
              placeholder={t('project.descriptionPlaceholder')}
              className="min-h-24 rounded-2xl border-border bg-background"
            />
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            <div className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Lightbulb className="size-4 text-primary" />
            </div>
            <p className="leading-6">{t('project.tip')}</p>
          </div>
        </div>
        <div className="flex justify-end border-t border-border bg-muted/20 px-6 py-4">
          <Button
            disabled={!isOnline || !draft?.name.trim()}
            onClick={onSave}
            className="h-11 rounded-full px-5 text-sm font-semibold"
          >
            {t('project.create')}
          </Button>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}

interface RemoveFromProjectDialogProps {
  state: RemoveFromProjectState | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function RemoveFromProjectDialog({
  state,
  onOpenChange,
  onConfirm,
}: RemoveFromProjectDialogProps) {
  const { t } = useI18n()

  return (
    <AlertDialog open={state !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('project.removeTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {state
              ? t('project.removeDescriptionWithNames', {
                  threadTitle: state.threadTitle,
                  projectName: state.projectName,
                })
              : t('project.removeDescriptionFallback')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t('common.remove')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
