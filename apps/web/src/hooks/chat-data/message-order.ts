import type { ChatMessage } from '@/hooks/chat-data/shared'

function getPrimaryOrder(message: ChatMessage) {
  if (typeof message.order === 'number') {
    return message.order
  }
  if (typeof message.createdAt === 'number') {
    return message.createdAt
  }
  return Number.POSITIVE_INFINITY
}

function getStepOrder(message: ChatMessage) {
  return typeof message.stepOrder === 'number' ? message.stepOrder : 0
}

export function compareChatMessages(left: ChatMessage, right: ChatMessage) {
  const primaryDelta = getPrimaryOrder(left) - getPrimaryOrder(right)
  if (primaryDelta !== 0) {
    return primaryDelta
  }

  const stepDelta = getStepOrder(left) - getStepOrder(right)
  if (stepDelta !== 0) {
    return stepDelta
  }

  return left.id.localeCompare(right.id)
}

export function sortChatMessages(messages: ChatMessage[]) {
  return messages.slice().sort(compareChatMessages)
}
