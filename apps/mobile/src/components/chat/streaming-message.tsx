import { StreamdownText } from "@0xbanky/react-native-streamdown";
import { useSmoothText } from "@convex-dev/agent/react";
import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";
import { isArabic } from "@/lib/is-arabic";
import { useAssistantMarkdownStyle } from "@/hooks/use-assistant-markdown-style";
import type { StreamingStore } from "./streaming-store";
import { useSyncExternalStore } from "react";

export function StreamingMessage({ store }: { store: StreamingStore }) {
  const rawText = useSyncExternalStore(store.subscribe, store.get);
  const [smoothedText] = useSmoothText(rawText, {
    startStreaming: true,
  });
  const { style: markdownStyle, themeKey } = useAssistantMarkdownStyle();
  const message = smoothedText || "";

  return (
    <StreamdownText
      key={themeKey}
      markdown={message}
      flavor="github"
      streamingAnimation={false}
      selectable={false}
      containerStyle={{
        writingDirection: isArabic(message) ? "rtl" : "ltr",
      }}
      markdownStyle={markdownStyle}
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
