import { StreamdownText } from "@0xbanky/react-native-streamdown";
import * as WebBrowser from "expo-web-browser";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { isArabic } from "@/lib/is-arabic";
import * as Clipboard from "expo-clipboard";
import { Copy, Check, File } from "lucide-react-native";
import { Icon } from "@/components/icon";
import { Image } from "@/components/tw";
import { useAssistantMarkdownStyle } from "@/hooks/use-assistant-markdown-style";
import { formatAttachmentKind } from "@/components/chat/attachment-types";
import {
  getMessageFileParts,
  type MessageFilePart,
} from "@chat/shared/logic/message-file-parts";

/** User bubble width when the row includes file/image attachments. */
const USER_ATTACHMENT_BUBBLE_CLASS = "w-[88%] max-w-[92%]";
const USER_DEFAULT_BUBBLE_CLASS = "max-w-[92%]";

export function Message({
  from,
  children,
  wide,
}: {
  from: "user" | "assistant";
  children: ReactNode;
  /** Use a wider bubble so attachment titles fit (file parts in the message). */
  wide?: boolean;
}) {
  if (from === "user") {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        className={[
          "self-end rounded-2xl bg-user-bubble p-3 mb-2 dark:bg-user-bubble",
          wide ? USER_ATTACHMENT_BUBBLE_CLASS : USER_DEFAULT_BUBBLE_CLASS,
        ].join(" ")}
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
  const { style: markdownStyle, themeKey } = useAssistantMarkdownStyle();
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
        key={themeKey}
        markdown={message}
        flavor="github"
        streamingAnimation={false}
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
      <Pressable
        onPress={handleCopy}
        hitSlop={8}
        className="mt-1 self-start flex-row items-center gap-1 rounded-md px-1.5 py-1 active:opacity-60"
      >
        {copied ? (
          <Icon icon={Check} className="w-3.5 h-3.5 text-foreground" />
        ) : (
          <Icon icon={Copy} className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <Text
          className={
            copied ? "text-xs text-foreground" : "text-xs text-muted-foreground"
          }
        >
          {copied ? "Copied" : "Copy"}
        </Text>
      </Pressable>
    </View>
  );
}

function formatMessageFileLabel(part: MessageFilePart) {
  return part.filename ?? "Attachment";
}

function formatMessageFileMeta(part: MessageFilePart) {
  if (part.mediaType === "application/pdf") {
    return "PDF";
  }

  return formatAttachmentKind(part.mediaType);
}

export function MessageAttachments({
  parts,
}: {
  parts?: Array<Record<string, unknown>>;
}) {
  const fileParts = getMessageFileParts(parts ?? []);

  if (fileParts.length === 0) {
    return null;
  }

  return (
    <View className="w-full gap-2">
      {fileParts.map((part, index) => {
        const isImage =
          part.mediaType.startsWith("image/") === true && !!part.url;
        const label = formatMessageFileLabel(part);
        const meta = formatMessageFileMeta(part);

        return (
          <View
            key={`${part.url ?? part.filename ?? "attachment"}-${index}`}
            className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card"
            style={{ borderCurve: "continuous" }}
          >
            {isImage ? (
              <View>
                <Image
                  source={{ uri: part.url }}
                  className="h-36 w-full bg-muted"
                  contentFit="cover"
                />
                <View className="border-t border-border/50 px-3 py-2">
                  <Text
                    className="text-sm font-medium text-foreground"
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <Text
                    className="text-xs text-muted-foreground"
                    numberOfLines={1}
                  >
                    {meta}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="flex-row items-center gap-3 px-3 py-3">
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Icon icon={File} className="h-4 w-4 text-foreground" />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-sm font-medium text-foreground"
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <Text
                    className="text-xs text-muted-foreground"
                    numberOfLines={1}
                  >
                    {meta}
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
