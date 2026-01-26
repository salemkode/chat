import { useEffect, useRef, useState } from "react";

const FPS = 20;
const MS_PER_FRAME = 1000 / FPS;
const INITIAL_CHARS_PER_SEC = 128;

export type SmoothTextOptions = {
  charsPerSec?: number;
  startStreaming?: boolean;
};

/**
 * A hook that smoothly displays text as it is streamed.
 */
export function useSmoothText(
  text: string,
  {
    charsPerSec = INITIAL_CHARS_PER_SEC,
    startStreaming = false,
  }: SmoothTextOptions = {},
): [string, { cursor: number; isStreaming: boolean }] {
  const [visibleText, setVisibleText] = useState(
    startStreaming ? "" : text || "",
  );
  const smoothState = useRef({
    tick: Date.now(),
    cursor: visibleText.length,
    lastUpdate: Date.now(),
    lastUpdateLength: text.length,
    charsPerMs: charsPerSec / 1000,
    initial: true,
  });

  const isStreaming = smoothState.current.cursor < text.length;

  useEffect(() => {
    if (!isStreaming) {
      return;
    }
    if (smoothState.current.lastUpdateLength !== text.length) {
      const timeSinceLastUpdate = Date.now() - smoothState.current.lastUpdate;
      const latestCharsPerMs =
        (text.length - smoothState.current.lastUpdateLength) /
        timeSinceLastUpdate;
      const rateError = latestCharsPerMs - smoothState.current.charsPerMs;
      const charLag =
        smoothState.current.lastUpdateLength - smoothState.current.cursor;
      const lagRate = charLag / timeSinceLastUpdate;
      const charsPerMs =
        latestCharsPerMs +
        (smoothState.current.initial
          ? 0
          : Math.max(0, (rateError + lagRate) / 2));
      smoothState.current.initial = false;
      smoothState.current.charsPerMs = Math.min(
        (2 * charsPerMs + smoothState.current.charsPerMs) / 3,
        smoothState.current.charsPerMs * 2,
      );
    }
    smoothState.current.tick = Math.max(
      smoothState.current.tick,
      Date.now() - MS_PER_FRAME,
    );
    smoothState.current.lastUpdate = Date.now();
    smoothState.current.lastUpdateLength = text.length;

    function update() {
      if (smoothState.current.cursor >= text.length) {
        return;
      }
      const now = Date.now();
      const timeSinceLastUpdate = now - smoothState.current.tick;
      const charsSinceLastUpdate = Math.floor(
        timeSinceLastUpdate * smoothState.current.charsPerMs,
      );
      const chars = Math.min(
        charsSinceLastUpdate,
        text.length - smoothState.current.cursor,
      );
      smoothState.current.cursor += chars;
      smoothState.current.tick += chars / smoothState.current.charsPerMs;
      setVisibleText(text.slice(0, smoothState.current.cursor));
    }
    update();
    const interval = setInterval(update, MS_PER_FRAME);
    return () => clearInterval(interval);
  }, [text, isStreaming, charsPerSec]);

  return [visibleText, { cursor: smoothState.current.cursor, isStreaming }];
}
