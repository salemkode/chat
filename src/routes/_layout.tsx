import {
  createFileRoute,
  Outlet,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import type { Id } from 'convex/_generated/dataModel'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AIPromptInput } from '@/components/ai-prompt-input'
import { AppSidebar } from '@/components/app-sidebar'
import { AuthRedirect } from '@/components/auth-redirect'
import {
  ChatModelProvider,
  useChatModel,
} from '@/components/chat-model-context'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  readPendingNewChatProjectId,
  writePendingNewChatProjectId,
} from '@/lib/project-selection'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import {
  useCachedSessionStatus,
  useDraft,
  useModels,
  useProjects,
  useSendMessage,
  useThread,
} from '@/hooks/use-chat-data'

export const Route = createFileRoute('/_layout')({
  ssr: false,
  component: ChatLayout,
})

function toModelDocId(value?: string): Id<'models'> | undefined {
  return value as Id<'models'> | undefined
}

function ChatLayout() {
  const { isAuthenticatedOrOffline, isLoading, isOfflineReady } =
    useCachedSessionStatus()

  if (isLoading && !isOfflineReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticatedOrOffline) {
    return <AuthRedirect />
  }

  return <AuthenticatedChatLayout />
}

function AuthenticatedChatLayout() {
  const isMobile = useIsMobile()
  const params = useParams({
    from: '/_layout/$chatId',
    shouldThrow: false,
    select: (routeParams: unknown) => {
      if (
        routeParams &&
        typeof routeParams === 'object' &&
        'chatId' in routeParams &&
        typeof routeParams.chatId === 'string'
      ) {
        return { chatId: routeParams.chatId }
      }
      return { chatId: undefined }
    },
  })
  const threadId = params?.chatId
  const composerTrayRef = useRef<HTMLDivElement>(null)
  const [mobileComposerHeight, setMobileComposerHeight] = useState(176)

  useEffect(() => {
    if (!isMobile) {
      return
    }

    const element = composerTrayRef.current
    if (!element) {
      return
    }

    const updateHeight = () => {
      setMobileComposerHeight(Math.ceil(element.getBoundingClientRect().height))
    }

    updateHeight()

    const observer = new ResizeObserver(() => {
      updateHeight()
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [isMobile, threadId])

  return (
    <SidebarProvider className="h-screen">
      <AppSidebar selectedThreadId={threadId ?? null} />

      <ChatModelProvider>
        <SidebarInset
          className="relative"
          style={
            isMobile
              ? ({
                  '--mobile-header-height': '52px',
                  '--mobile-composer-height': `${mobileComposerHeight}px`,
                } as CSSProperties)
              : undefined
          }
        >
          <Outlet />

          <div className="absolute bottom-0 left-0 right-0 z-20">
            <div className="w-full max-w-3xl mx-auto px-2 sm:px-4">
              <ChatComposer threadId={threadId} />
            </div>
          </div>
        </SidebarInset>
      </ChatModelProvider>
    </SidebarProvider>
  )
}

function ChatComposer({
  threadId,
  mobile = false,
}: {
  threadId?: string
  mobile?: boolean
}) {
  const navigate = useNavigate()
  const { models } = useModels()
  const { projects } = useProjects()
  const { send, disabledReason } = useSendMessage()
  const thread = useThread(threadId)
  const draftKey = threadId || 'new'
  const { draft, setDraft } = useDraft(draftKey)
  const { selectedModelId, setSelectedModelId } = useChatModel()
  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >(undefined)

  useEffect(() => {
    if (threadId) {
      setSelectedProjectId(thread?.projectId)
      return
    }

    setSelectedProjectId(readPendingNewChatProjectId())
  }, [thread?.projectId, threadId])

  const selectedModelDocId = useMemo(
    () =>
      models.find(
        (model: { modelId: string; id: string }) =>
          model.modelId === selectedModelId,
      )?.id,
    [models, selectedModelId],
  )

  async function handleSendMessage(
    text: string,
    opts: { searchEnabled: boolean; projectId?: string; attachments: File[] },
  ) {
    const result = await send({
      text,
      threadId,
      modelDocId: toModelDocId(selectedModelDocId),
      projectId: opts.projectId as Id<'projects'> | undefined,
      searchEnabled: opts.searchEnabled,
      attachments: opts.attachments,
    })

    if (!threadId) {
      writePendingNewChatProjectId(undefined)
    }

    if (result.threadId && result.threadId !== threadId) {
      await navigate({ to: '/$chatId', params: { chatId: result.threadId } })
    }
  }

  return (
    <AIPromptInput
      value={draft}
      onValueChange={(value) => void setDraft(value)}
      onSubmit={handleSendMessage}
      mobile={mobile}
      disabled={disabledReason !== null}
      footerText={
        disabledReason === 'offline'
          ? 'Offline mode is read-only. Cached chats stay available until you reconnect.'
          : undefined
      }
      projects={projects}
      selectedProjectId={selectedProjectId}
      onProjectChange={(nextProjectId) => {
        if (!threadId) {
          setSelectedProjectId(nextProjectId)
          writePendingNewChatProjectId(nextProjectId)
          return
        }

        if (!nextProjectId && thread?.projectId) {
          return
        }

        if (
          thread?.projectId &&
          nextProjectId &&
          thread.projectId !== nextProjectId
        ) {
          const nextProjectName =
            projects.find(
              (project: (typeof projects)[number]) =>
                project.id === nextProjectId,
            )?.name || 'the selected project'

          if (
            !window.confirm(
              `Move this chat from ${thread.projectName || 'its current project'} to ${nextProjectName}?`,
            )
          ) {
            return
          }
        }

        setSelectedProjectId(nextProjectId)
      }}
      selectedModel={selectedModelId}
      onModelChange={setSelectedModelId}
    />
  )
}
