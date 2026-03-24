import { Folder, MessageSquare, X } from 'lucide-react'
import { ShareChatDialog } from '@/components/chat/ShareChatDialog'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'

export type ChatThreadHeaderProps = {
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
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-background/80 px-2 backdrop-blur-sm sm:px-4">
      <div className="mx-auto flex h-full w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="text-foreground hover:bg-muted hover:text-foreground" />
          <div className="flex min-w-0 items-center gap-2">
            <MessageSquare className="size-4 text-muted-foreground" />
            <h1 className="max-w-[300px] truncate font-semibold text-foreground">
              {title}
            </h1>
            {projectId ? (
              <div className="flex items-center gap-2 rounded-full border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
                <Folder className="size-3.5" />
                <span>{projectName || 'Project'}</span>
                {onRemoveFromProject ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5"
                    onClick={onRemoveFromProject}
                  >
                    <X className="size-3" />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {threadId ? (
          <ShareChatDialog threadId={threadId} threadTitle={title} />
        ) : null}
      </div>
    </header>
  )
}
