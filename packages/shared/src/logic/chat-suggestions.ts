import type { Locale } from './i18n'

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

const chatSuggestionsByLocale: Record<Locale, ChatSuggestion[]> = {
  en: chatSuggestions,
  ar: [
    {
      id: 'plan-work',
      title: 'خطط عملي',
      prompt: 'ساعدني في تقسيم هذه المهمة إلى خطوات واضحة وأولويات والإجراءات التالية.',
    },
    {
      id: 'explain-topic',
      title: 'اشرح موضوعاً',
      prompt: 'اشرح هذا الموضوع بلغة بسيطة، ثم أعطني مثالاً عملياً واحداً.',
    },
    {
      id: 'review-idea',
      title: 'راجع الفكرة',
      prompt: 'راجع فكرتي بشكل نقدي ووضّح المخاطر والمفاضلات والخيارات الأفضل.',
    },
    {
      id: 'write-draft',
      title: 'اكتب مسودة',
      prompt: 'اكتب لي مسودة قصيرة ثم حسّنها حسب النبرة التي أريدها.',
    },
  ],
}

export function getChatSuggestions(locale: Locale): ChatSuggestion[] {
  return chatSuggestionsByLocale[locale] ?? chatSuggestions
}
