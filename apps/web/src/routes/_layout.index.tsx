import { createFileRoute } from '@tanstack/react-router'
import { ChatThreadHeader } from '@/components/chat/ChatThreadHeader'

export const Route = createFileRoute('/_layout/')({
  ssr: false,
  component: NewChatIndex,
})

function NewChatIndex() {
  return (
    <div className="flex h-full flex-col">
      <ChatThreadHeader title="New Chat" />

      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.05] md:block" />

      <div className="min-h-0 flex-1" />
    </div>
  )
}
