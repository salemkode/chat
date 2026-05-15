import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'
import type { QueuedMessage as QueuedMessageCore } from '@chat/shared/logic/chat-generation-core'
import {
  QUEUE_CAPACITY,
  STALL_THRESHOLD_MS,
  buildMessageProgressSignature,
  buildPromptMessageIdsByIndex,
  dequeueQueuedMessage,
  enqueueQueuedMessage,
  findPromptMessageId,
  getLatestActiveAssistant,
  isGenerationStalled,
} from '@chat/shared/logic/chat-generation-core'

export type ChatMessage = FunctionReturnType<typeof api.chat.listMessages>['page'][number]

export type { MessageFailureKind, MessageFailureMode } from '@chat/shared/logic/message-failure'
export { getMessageFailurePresentation } from '@chat/shared/logic/message-failure'

/** Web composer attaches browser `File` objects. */
export type QueuedMessage = QueuedMessageCore<File>

export {
  QUEUE_CAPACITY,
  STALL_THRESHOLD_MS,
  buildMessageProgressSignature,
  buildPromptMessageIdsByIndex,
  dequeueQueuedMessage,
  enqueueQueuedMessage,
  findPromptMessageId,
  getLatestActiveAssistant,
  isGenerationStalled,
}
