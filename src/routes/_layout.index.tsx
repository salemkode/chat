import { createFileRoute } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'

export const Route = createFileRoute('/_layout/')({
  component: NewChatIndex,
})

function NewChatIndex() {
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
