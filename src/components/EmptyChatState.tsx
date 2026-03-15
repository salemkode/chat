import { Sparkles } from 'lucide-react'

export function EmptyChatState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 pb-[calc(var(--mobile-composer-height,11rem)*0.3)] text-center">
      <div className="relative flex flex-col items-center gap-5">
        <div className="pointer-events-none absolute inset-x-6 top-3 h-20 rounded-full bg-primary/10 blur-3xl" />
        <div className="mobile-empty-state-orb">
          <Sparkles className="size-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-[1.75rem] leading-none font-semibold tracking-tight text-foreground">
            Start something good
          </h2>
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            Ask a question, attach a file, or tag a project to keep this chat
            organized.
          </p>
        </div>
      </div>
    </div>
  )
}
