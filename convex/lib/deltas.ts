// Minimal stubs for streaming functionality
// TODO: Implement full streaming support

import type { Doc, Id } from "../_generated/dataModel.js";
import { v } from "convex/values";

// Types
export type StreamDelta = any;
export type StreamMessage = Doc<"streamingMessages">;
export type MessageWithMetadataInternal = any;

// Validators
export const vStreamDelta = v.any();
export const vStreamMessage = v.any();

// Functions
export async function deriveUIMessagesFromDeltas(
  threadId: string,
  streamMessages: StreamMessage[],
  allDeltas: StreamDelta[],
): Promise<any[]> {
  // TODO: Implement
  return [];
}
