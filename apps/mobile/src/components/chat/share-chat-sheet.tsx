import { Icon } from "@/components/icon";
import { buildChatShareUrl } from "@/lib/chat-share-url";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ShareChatSheetProps = {
  visible: boolean;
  threadId: string;
  threadTitle: string;
  onClose: () => void;
};

export function ShareChatSheet({
  visible,
  threadId,
  threadTitle,
  onClose,
}: ShareChatSheetProps) {
  const insets = useSafeAreaInsets();
  const createOrUpdateChatShare = useMutation(api.shares.createOrUpdateChatShare);
  const [isCreating, setIsCreating] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const requestIdRef = useRef(0);

  const shareUrl = useMemo(
    () => (shareToken ? buildChatShareUrl(shareToken) : null),
    [shareToken],
  );

  const resetState = useCallback(() => {
    setIsCreating(false);
    setShareToken(null);
    setMessageCount(null);
    setError(null);
    setCopied(false);
    requestIdRef.current += 1;
  }, []);

  useEffect(() => {
    if (!visible) {
      resetState();
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsCreating(true);
    setError(null);
    setShareToken(null);
    setMessageCount(null);
    setCopied(false);

    void createOrUpdateChatShare({ threadId })
      .then((result) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        if (!result?.token) {
          setError("Send a message in this chat before sharing it.");
          return;
        }
        setShareToken(result.token);
        setMessageCount(result.messageCount);
      })
      .catch((shareError: unknown) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setError(
          shareError instanceof Error
            ? shareError.message
            : "Failed to create a share link",
        );
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsCreating(false);
        }
      });
  }, [createOrUpdateChatShare, resetState, threadId, visible]);

  const generateShare = useCallback(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsCreating(true);
    setError(null);

    void createOrUpdateChatShare({ threadId })
      .then((result) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        if (!result?.token) {
          setError("Send a message in this chat before sharing it.");
          return;
        }
        setShareToken(result.token);
        setMessageCount(result.messageCount);
      })
      .catch((shareError: unknown) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setError(
          shareError instanceof Error
            ? shareError.message
            : "Failed to create a share link",
        );
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsCreating(false);
        }
      });
  }, [createOrUpdateChatShare, threadId]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) {
      if (shareToken) {
        await Clipboard.setStringAsync(shareToken);
        setCopied(true);
      }
      return;
    }

    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
  }, [shareToken, shareUrl]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timeoutId = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeoutId);
  }, [copied]);

  const handleNativeShare = useCallback(async () => {
    if (!shareUrl && !shareToken) {
      return;
    }

    const message = shareUrl ?? shareToken ?? "";
    await Share.share({
      message,
      url: shareUrl ?? undefined,
      title: threadTitle,
    });
  }, [shareToken, shareUrl, threadTitle]);

  const handleOpenSharePage = useCallback(() => {
    if (!shareUrl) {
      return;
    }
    void Linking.openURL(shareUrl);
  }, [shareUrl]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 bg-background"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <Text className="text-[17px] font-semibold text-foreground">
            Share chat
          </Text>
          <Pressable
            onPress={onClose}
            className="px-3 py-1.5 rounded-lg active:bg-muted"
          >
            <Text className="text-[17px] text-foreground">Done</Text>
          </Pressable>
        </View>

        <View className="flex-1 px-4 py-4 gap-4">
          <Text className="text-[15px] leading-5 text-muted-foreground">
            This link publishes only the chat transcript for{" "}
            <Text className="font-medium text-foreground">{threadTitle}</Text>.
            It excludes sidebar, projects, models, and other workspace context.
            The shared page is a fixed snapshot of the current chat.
          </Text>

          <View className="rounded-2xl border border-border bg-muted/30 p-4 gap-3">
            {isCreating ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator />
                <Text className="text-[15px] text-foreground">
                  Preparing your shared transcript...
                </Text>
              </View>
            ) : error ? (
              <View className="gap-3">
                <Text className="text-[15px] text-destructive">{error}</Text>
                <Pressable
                  onPress={() => void generateShare()}
                  className="self-start px-4 py-2 rounded-lg border border-border active:bg-muted"
                >
                  <Text className="text-[15px] text-foreground">Try again</Text>
                </Pressable>
              </View>
            ) : shareUrl || shareToken ? (
              <View className="gap-3">
                <Text className="text-[15px] leading-5 text-muted-foreground">
                  Anyone with this link can view the full shared chat.
                  {typeof messageCount === "number"
                    ? ` Current snapshot: ${messageCount} messages.`
                    : ""}
                </Text>
                <Text className="text-[15px] leading-5 text-muted-foreground">
                  Later changes to this chat will not appear in this shared
                  link. Create a new share if you want an updated snapshot.
                </Text>
                <View className="flex-row items-center gap-2">
                  <View className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5">
                    <Text
                      selectable
                      numberOfLines={2}
                      className="text-[14px] text-foreground"
                    >
                      {shareUrl ?? shareToken}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void handleCopy()}
                    accessibilityLabel="Copy share link"
                    className="w-11 h-11 items-center justify-center rounded-xl border border-border active:bg-muted"
                  >
                    <Icon
                      icon={copied ? Check : Copy}
                      className="w-5 h-5 text-foreground"
                    />
                  </Pressable>
                </View>
                {!shareUrl ? (
                  <Text className="text-[13px] text-muted-foreground">
                    Set EXPO_PUBLIC_APP_URL to share a full link. The share
                    token was copied when you tap Copy.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {(shareUrl || shareToken) && !isCreating && !error ? (
            <View className="gap-2">
              <Pressable
                onPress={() => void handleNativeShare()}
                className="flex-row items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 active:opacity-80"
              >
                <Icon icon={Share2} className="w-5 h-5 text-background" />
                <Text className="text-[16px] font-medium text-background">
                  Share link
                </Text>
              </Pressable>
              {shareUrl ? (
                <Pressable
                  onPress={handleOpenSharePage}
                  className="flex-row items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 active:bg-muted"
                >
                  <Icon
                    icon={ExternalLink}
                    className="w-5 h-5 text-foreground"
                  />
                  <Text className="text-[16px] font-medium text-foreground">
                    Open share page
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
