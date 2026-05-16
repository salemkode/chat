import { StreamdownText } from "@0xbanky/react-native-streamdown";
import * as WebBrowser from "expo-web-browser";
import type { ReactNode } from "react";
import { Linking, Platform, Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

const VAR_NAMES = [
  "--app-foreground",
  "--app-muted-foreground",
  "--app-border",
  "--app-secondary",
  "--app-muted",
  "--app-accent",
  "--color-blue-400",
] as const;

export function Message({
  from,
  children,
}: {
  from: "user" | "assistant";
  children: ReactNode;
}) {
  if (from === "user") {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        className="max-w-[80%] self-end rounded-2xl bg-user-bubble dark:bg-user-bubble p-3 mb-2"
        style={{ borderCurve: "continuous" }}
      >
        {typeof children === "string" ? (
          <Text
            selectable
            className="text-base leading-5.5 text-foreground dark:text-foreground"
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      className="mb-2"
    >
      {children}
    </Animated.View>
  );
}

export function MessageResponse({ children }: { children: string }) {
  const [text, text2, border, bg2, bg3, fill3, link] = useCSSVariable(
    VAR_NAMES as unknown as string[],
  ) as string[];

  return (
    <StreamdownText
      markdown={children || "..."}
      flavor="github"
      streamingAnimation={false}
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
