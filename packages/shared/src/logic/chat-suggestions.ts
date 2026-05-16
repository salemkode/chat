export type ChatSuggestion = {
  id: string
  title: string
  prompt: string
}

export const chatSuggestions: ChatSuggestion[] = [
  {
    id: 'plan-work',
    title: 'Plan my work',
    prompt: 'Help me break this task into clear steps, priorities, and next actions.',
  },
  {
    id: 'explain-topic',
    title: 'Explain a topic',
    prompt: 'Explain this topic in simple terms, then give one practical example.',
  },
  {
    id: 'review-idea',
    title: 'Review an idea',
    prompt: 'Review my idea critically and point out risks, tradeoffs, and better options.',
  },
  {
    id: 'write-draft',
    title: 'Write a draft',
    prompt: 'Draft a concise message for me, then improve it based on the tone I want.',
  },
]
