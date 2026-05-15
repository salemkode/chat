import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MessageActivityTimeline } from './message-activity-timeline'

const spies = vi.hoisted(() => ({
  chatMarkdown: vi.fn<(props: { text: string; isStreaming?: boolean }) => void>(),
}))

vi.mock('@chat/shared/hooks/use-smooth-text', () => ({
  useSmoothText: (text: string) => [text],
}))

vi.mock('@/components/chat-markdown', () => ({
  ChatMarkdown: (props: { text: string; isStreaming?: boolean; className?: string }) => {
    spies.chatMarkdown(props)
    return (
      <div data-chat-markdown={props.isStreaming ? 'streaming' : 'static'}>{props.text}</div>
    )
  },
}))

vi.mock('@/components/ui/chain-of-thought', () => ({
  ChainOfThought: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ChainOfThoughtContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ChainOfThoughtItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ChainOfThoughtStep: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ChainOfThoughtTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/original-thinking-loader', () => ({
  OriginalThinkingLoader: () => <div>loading</div>,
}))

vi.mock('@/components/ui/source', () => ({
  Source: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SourceContent: ({ title }: { title: string }) => <div>{title}</div>,
  SourceTrigger: () => <div>source</div>,
}))

describe('MessageActivityTimeline', () => {
  it('renders live reasoning through ChatMarkdown with streaming enabled', () => {
    spies.chatMarkdown.mockClear()

    renderToStaticMarkup(
      <MessageActivityTimeline
        parts={[{ type: 'reasoning', text: 'Streaming reasoning' }]}
        messageStatus="streaming"
      />,
    )

    expect(spies.chatMarkdown).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Streaming reasoning',
        isStreaming: true,
      }),
    )
  })
})
