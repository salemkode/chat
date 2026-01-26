"use client";

import { useMemo, useState, useEffect } from "react";
import { type UIDataTypes, type UIMessageChunk, type UITools } from "ai";
import type { StreamQuery, StreamQueryArgs } from "./types";
import { type UIMessage } from "@/lib/agent/UIMessages";
import {
  blankUIMessage,
  getParts,
  updateFromUIMessageChunks,
  deriveUIMessagesFromTextStreamParts,
} from "@/lib/agent/deltas";
import { useDeltaStreams } from "./useDeltaStreams";

// Polyfill structuredClone
if (!("structuredClone" in globalThis)) {
  void import("@ungap/structured-clone" as any).then(
    ({ default: structuredClone }) =>
      (globalThis.structuredClone = structuredClone),
  );
}

/**
 * A hook that fetches streaming messages from a thread and converts them to UIMessages.
 */
export function useStreamingUIMessages<
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
  Query extends StreamQuery<any> = StreamQuery<object>,
>(
  query: Query,
  args: StreamQueryArgs<Query> | "skip",
  options?: {
    startOrder?: number;
    skipStreamIds?: string[];
  },
): UIMessage<METADATA, DATA_PARTS, TOOLS>[] | undefined {
  const [messageState, setMessageState] = useState<
    Record<
      string,
      {
        uiMessage: UIMessage<METADATA, DATA_PARTS, TOOLS>;
        cursor: number;
      }
    >
  >({});

  const streams = useDeltaStreams(query, args, options);

  const threadId = args === "skip" ? undefined : args.threadId;

  useEffect(() => {
    if (!streams) return;
    let noNewDeltas = true;
    for (const stream of streams) {
      const lastDelta = stream.deltas.at(-1);
      const cursor = messageState[stream.streamMessage.streamId]?.cursor;
      if (!cursor) {
        noNewDeltas = false;
        break;
      }
      if (lastDelta && lastDelta.start >= cursor) {
        noNewDeltas = false;
        break;
      }
    }
    if (noNewDeltas) {
      return;
    }
    const abortController = new AbortController();
    void (async () => {
      const newMessageState: Record<
        string,
        {
          uiMessage: UIMessage<METADATA, DATA_PARTS, TOOLS>;
          cursor: number;
        }
      > = Object.fromEntries(
        await Promise.all(
          streams.map(async ({ deltas, streamMessage }) => {
            const { parts, cursor } = getParts<UIMessageChunk>(deltas, 0);
            if (streamMessage.format === "UIMessageChunk") {
              const uiMessage = await updateFromUIMessageChunks(
                blankUIMessage(streamMessage, threadId),
                parts,
              );
              return [
                streamMessage.streamId,
                {
                  uiMessage,
                  cursor,
                },
              ];
            } else {
              const [uiMessages] = deriveUIMessagesFromTextStreamParts(
                threadId,
                [streamMessage],
                [],
                deltas,
              );
              return [
                streamMessage.streamId,
                {
                  uiMessage: uiMessages[0],
                  cursor,
                },
              ];
            }
          }),
        ),
      );
      if (abortController.signal.aborted) return;
      setMessageState(newMessageState);
    })();
    return () => {
      abortController.abort();
    };
  }, [messageState, streams, threadId]);

  return useMemo(() => {
    if (!streams) return undefined;
    return streams
      .map(
        ({ streamMessage }) => messageState[streamMessage.streamId]?.uiMessage,
      )
      .filter((uiMessage) => uiMessage !== undefined);
  }, [messageState, streams]);
}
