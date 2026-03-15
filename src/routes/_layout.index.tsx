import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { EmptyChatState } from '@/components/EmptyChatState'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import { useChatModel } from '@/components/chat-model-context'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ModelSelectorPanel } from '@/components/model-selector'

export const Route = createFileRoute('/_layout/')({
  ssr: false,
  component: NewChatIndex,
})

function NewChatIndex() {
  const isMobile = useIsMobile()
  const { selectedModelId, setSelectedModelId } = useChatModel()
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)

  if (isMobile) {
    return (
      <div className="mobile-chat-page flex h-full min-h-0 flex-col">
        <header className="mobile-chat-header flex h-[calc(52px+env(safe-area-inset-top))] shrink-0 items-end px-3 pb-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <SidebarTrigger className="size-9 rounded-full bg-background/55 text-foreground shadow-sm hover:bg-background/70" />
            <button
              type="button"
              onClick={() => setModelSelectorOpen(true)}
              className="flex items-center gap-2 rounded-full bg-background/55 px-3 py-2 text-foreground shadow-sm hover:bg-background/70 transition-colors"
            >
              <span className="text-[15px] font-semibold">New chat</span>
            </button>
          </div>
        </header>

        <Sheet open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
          <SheetContent side="bottom" className="h-[60vh]">
            <ModelSelectorPanel
              selectedModel={selectedModelId}
              onSelectModel={(modelId) => {
                setSelectedModelId(modelId)
                setModelSelectorOpen(false)
              }}
            />
          </SheetContent>
        </Sheet>

        <div className="min-h-0 flex-1">
          <EmptyChatState />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col relative">
      <header className="h-14 flex items-center justify-between backdrop-blur-sm shrink-0 absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="font-semibold">✨ New Chat</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-4 pb-48">
        <div className="flex flex-col items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold">How can I help you today?</h2>
        </div>
      </div>
    </div>
  )
}
