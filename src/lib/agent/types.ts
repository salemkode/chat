// Minimal types needed for the agent migration
// Extracted from @convex-dev/agent/client/types

export type SyncStreamsReturnValue =
  | { kind: 'list'; messages: StreamMessage[] }
  | { kind: 'deltas'; deltas: StreamDelta[] }

export interface StreamMessage {
  streamId: string
  status: 'streaming' | 'finished' | 'aborted'
  format?: 'UIMessageChunk' | 'TextStreamPart'
  order: number
  stepOrder: number
  userId?: string
  agentName?: string
  model?: string
  provider?: string
}

export interface StreamDelta {
  streamId: string
  start: number
  end: number
  parts: any[]
}
