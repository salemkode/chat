import { StreamdownText } from "@0xbanky/react-native-streamdown";
import * as WebBrowser from "expo-web-browser";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { isArabic } from "@/lib/is-arabic";
import * as Clipboard from "expo-clipboard";
import { Copy, Check, File } from "lucide-react-native";
import { Icon } from "@/components/icon";
import { Image } from "@/components/tw";

const VAR_NAMES = [
  "--app-foreground",
  "--app-muted-foreground",
  "--app-border",
  "--app-secondary",
  "--app-muted",
  "--app-accent",
  "--color-blue-400",
] as const;

type MessageFilePart = {
  filename?: string;
  mediaType?: string;
  url?: string;
};

function readMessageFilePart(part: Record<string, unknown>): MessageFilePart | null {
  if (part.type !== "file") {
    return null;
  }

  return {
    url: typeof part.url === "string" ? part.url : undefined,
    mediaType: typeof part.mediaType === "string" ? part.mediaType : undefined,
    filename: typeof part.filename === "string" ? part.filename : undefined,
  };
}

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
  const [copied, setCopied] = useState(false);

  const message = children || "...";

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message]);

  return (
    <View>
      <StreamdownText
        markdown={message}
        flavor="github"
        streamingAnimation={false}
        containerStyle={{
          writingDirection: isArabic(message) ? "rtl" : "ltr",
        }}
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
      <Pressable
        onPress={handleCopy}
        hitSlop={8}
        className="mt-1 self-start flex-row items-center gap-1 rounded-md px-1.5 py-1 active:opacity-60"
      >
        {copied ? (
          <Check size={13} className="text-muted-foreground" />
        ) : (
          <Copy size={13} className="text-muted-foreground" />
        )}
        <Text className="text-xs text-muted-foreground">
          {copied ? "Copied" : "Copy"}
        </Text>
      </Pressable>
    </View>
  );
}

export function MessageAttachments({
  parts,
}: {
  parts?: Array<Record<string, unknown>>;
}) {
  const fileParts = (parts ?? [])
    .map(readMessageFilePart)
    .filter((part): part is MessageFilePart => part !== null);

  if (fileParts.length === 0) {
    return null;
  }

  return (
    <View className="mb-2 gap-2">
      {fileParts.map((part, index) => {
        const isImage =
          part.mediaType?.startsWith("image/") === true && !!part.url;

        return (
          <View
            key={`${part.url ?? part.filename ?? "attachment"}-${index}`}
            className="overflow-hidden rounded-2xl border border-white/15 bg-background/15"
            style={{ borderCurve: "continuous" }}
          >
            {isImage ? (
              <Image
                source={{ uri: part.url }}
                className="h-36 w-full bg-background/10"
                contentFit="cover"
              />
            ) : (
              <View className="flex-row items-center gap-3 px-3 py-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-background/15">
                  <Icon icon={File} className="h-4 w-4 text-foreground" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-sm font-medium text-foreground"
                    numberOfLines={1}
                  >
                    {part.filename ?? "Attachment"}
                  </Text>
                  <Text
                    className="text-xs text-muted-foreground"
                    numberOfLines={1}
                  >
                    {part.mediaType ?? "application/octet-stream"}
                  </Text>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
