import { useSmoothText } from "@convex-dev/agent/react";
import { ChatMarkdown } from "@/components/markdown";
import type { StreamingStore } from "./streaming-store";
import { useSyncExternalStore } from "react";

export function StreamingMessage({ store }: { store: StreamingStore }) {
  const rawText = useSyncExternalStore(store.subscribe, store.get);
  const [smoothedText] = useSmoothText(rawText, {
    startStreaming: true,
  });
  const message = smoothedText || "";

  return <ChatMarkdown>{message}</ChatMarkdown>;
}
