/** Sort chat messages by order, stepOrder, then id (shared web + mobile). */

export type MessageOrderRow = {
  id: string
  order?: number
  stepOrder?: number
  createdAt?: number
}

function getPrimaryOrder(message: MessageOrderRow) {
  if (typeof message.order === 'number') {
    return message.order
  }
  if (typeof message.createdAt === 'number') {
    return message.createdAt
  }
  return Number.POSITIVE_INFINITY
}

function getStepOrder(message: MessageOrderRow) {
  return typeof message.stepOrder === 'number' ? message.stepOrder : 0
}

function compareMessages(left: MessageOrderRow, right: MessageOrderRow) {
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

export function sortChatMessages<T extends MessageOrderRow>(messages: T[]): T[] {
  return messages.slice().sort(compareMessages)
}
