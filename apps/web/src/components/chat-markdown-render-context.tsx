import { createContext, useContext } from 'react'

export const ChatMarkdownRenderContext = createContext<{ isStreaming: boolean }>({
  isStreaming: false,
})

export function useChatMarkdownIsStreaming(): boolean {
  return useContext(ChatMarkdownRenderContext).isStreaming
}
