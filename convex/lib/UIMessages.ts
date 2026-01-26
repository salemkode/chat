// Minimal stub for UIMessages
// TODO: Implement full UIMessages support

import type { Doc, Id } from "../_generated/dataModel.js";

export type UIMessage = any;

export function fromUIMessages(
  uiMessages: any[],
  streamingMessage: Doc<"streamingMessages">,
): any {
  // TODO: Implement
  return {
    role: "assistant",
    content: [],
  };
}
