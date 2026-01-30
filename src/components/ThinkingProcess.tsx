import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ui/reasoning'
import { Sparkles } from 'lucide-react'
import { MarkdownContent } from './MarkdownContent'
import { useSmoothText } from '@convex-dev/agent/react'

interface ThinkingProcessProps {
  text: string
  isStreaming?: boolean
}

export function ThinkingProcess({ text, isStreaming }: ThinkingProcessProps) {
  const [thinkingContent] = useSmoothText(text, { startStreaming: isStreaming })
  return (
    <Reasoning isStreaming={isStreaming} className="mb-4">
      <ReasoningTrigger>
        <div className="flex items-center gap-2 w-full py-2 text-left">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Reasoning
          </span>
        </div>
      </ReasoningTrigger>
      <ReasoningContent className="mt-2 w-full">
        <div className="p-4 rounded-lg bg-muted/50 w-full">
          <div className="text-sm text-muted-foreground leading-relaxed">
            <MarkdownContent content={thinkingContent} className="max-w-none" />
          </div>
        </div>
      </ReasoningContent>
    </Reasoning>
  )
}
