import { StreamdownText } from "@0xbanky/react-native-streamdown";
import { useSmoothText } from "@convex-dev/agent/react";
import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";
import { useCSSVariable } from "uniwind";
import type { StreamingStore } from "./streaming-store";
import { useSyncExternalStore } from "react";

const VAR_NAMES = [
  "--app-foreground",
  "--app-muted-foreground",
  "--app-border",
  "--app-secondary",
  "--app-muted",
  "--app-accent",
  "--color-blue-400",
] as const;

export function StreamingMessage({ store }: { store: StreamingStore }) {
  const rawText = useSyncExternalStore(store.subscribe, store.get);
  const [smoothedText] = useSmoothText(rawText, {
    startStreaming: true,
  });
  const [text, text2, border, bg2, bg3, fill3, link] = useCSSVariable(
    VAR_NAMES as unknown as string[],
  ) as string[];

  return (
    <StreamdownText
      markdown={smoothedText || ""}
      flavor="github"
      streamingAnimation={false}
      selectable={false}
      markdownStyle={{
        paragraph: { color: text, fontSize: 16, lineHeight: 22 },
        h1: { color: text },
        h2: { color: text },
        h3: { color: text },
        h4: { color: text },
        h5: { color: text },
        h6: { color: text },
        blockquote: {
          backgroundColor: bg3,
          borderColor: border,
        },
        codeBlock: {
          backgroundColor: fill3,
          borderColor: border,
          color: text,
        },
        code: {
          color: text,
          backgroundColor: fill3,
        },
        link: { color: link },
        list: {
          bulletColor: text2,
          markerColor: text2,
        },
        strong: { color: text },
        em: { color: text },
        thematicBreak: { color: border },
        table: {
          borderColor: border,
          headerBackgroundColor: bg2,
          headerTextColor: text,
        },
      }}
      onLinkPress={({ url }) => {
        if (Platform.OS === "web") {
          Linking.openURL(url);
        } else {
          WebBrowser.openBrowserAsync(url, {
            presentationStyle:
              WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
    />
  );
}
