'use client'

import { CircleDollarSign, Folder, GraduationCap, Lightbulb, NotebookPen, Plane, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DialogHeader,
} from '@/components/ui/dialog'
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
    label: 'Investing',
    icon: CircleDollarSign,
    className: 'text-emerald-300',
  },
  {
    label: 'Homework',
    icon: GraduationCap,
    className: 'text-sky-300',
  },
  {
    label: 'Writing',
    icon: NotebookPen,
    className: 'text-violet-300',
  },
  {
    label: 'Travel',
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
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        size="medium"
        showCloseButton={false}
        className="max-w-[34rem] gap-0 overflow-hidden rounded-[1.75rem] border border-border bg-card p-0 text-card-foreground"
      >
        <DialogHeader className="border-b border-border bg-muted/20 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <ResponsiveModalTitle className="text-[1.45rem] font-semibold tracking-tight text-foreground">
                Create project
              </ResponsiveModalTitle>
              <p className="text-sm text-muted-foreground">
                Group related chats, files, and instructions in one place.
              </p>
            </div>
            <ResponsiveModalClose asChild>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close project dialog"
              >
                <X className="size-4" />
              </button>
            </ResponsiveModalClose>
          </div>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Project name</label>
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
                placeholder="Copenhagen Trip"
                className="h-11 rounded-2xl border-border bg-background pl-10"
              />
            </div>
          </div>

          {draft ? (
            <div className="flex flex-wrap gap-2">
              {PROJECT_TEMPLATE_OPTIONS.map((option) => {
                const Icon = option.icon

                return (
                  <button
                    key={option.label}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() =>
                      onDraftChange((current) =>
                        current
                          ? {
                              ...current,
                              name: current.name || option.label,
                            }
                          : current,
                      )
                    }
                  >
                    <Icon className={cn('size-4', option.className)} />
                    {option.label}
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description</label>
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
              placeholder="Add context, instructions, or what this project is for."
              className="min-h-24 rounded-2xl border-border bg-background"
            />
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            <div className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Lightbulb className="size-4 text-primary" />
            </div>
            <p className="leading-6">
              Projects keep chats, files, and custom instructions in one place so long-running work stays organized.
            </p>
          </div>
        </div>
        <div className="flex justify-end border-t border-border bg-muted/20 px-6 py-4">
          <Button
            disabled={!isOnline || !draft?.name.trim()}
            onClick={onSave}
            className="h-11 rounded-full px-5 text-sm font-semibold"
          >
            Create project
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
  return (
    <AlertDialog open={state !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove chat from project?</AlertDialogTitle>
          <AlertDialogDescription>
            {state
              ? `"${state.threadTitle}" will be removed from "${state.projectName}", but the chat will still be kept.`
              : 'The chat will be removed from this project, but it will still be kept.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
