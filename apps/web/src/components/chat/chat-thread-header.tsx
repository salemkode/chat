import { Folder, MessageSquare, X } from '@/lib/icons'
import { ShareChatDialog } from '@/components/chat/share-chat-dialog'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'

type ChatThreadHeaderProps = {
  title: string
  threadId?: string
  projectId?: string
  projectName?: string | null
  onRemoveFromProject?: () => void
}

export function ChatThreadHeader({
  title,
  threadId,
  projectId,
  projectName,
  onRemoveFromProject,
}: ChatThreadHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border/70 bg-background/88 px-3 py-2.5 backdrop-blur-xl sm:px-4">
      <div className="mx-auto flex min-h-10 w-full max-w-[56rem] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="text-foreground hover:bg-muted hover:text-foreground" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
            <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground sm:text-base">
              {title}
            </h1>
            {projectId ? (
              <div className="flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
                <Folder className="size-3.5" />
                <span className="truncate">{projectName || 'Project'}</span>
                {onRemoveFromProject ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 shrink-0"
                    onClick={onRemoveFromProject}
                  >
                    <X className="size-3" />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {threadId ? <ShareChatDialog threadId={threadId} threadTitle={title} /> : null}
      </div>
    </header>
  )
}
