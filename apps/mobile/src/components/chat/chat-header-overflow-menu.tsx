import { RenameChatModal } from "@/components/chat/rename-chat-modal";
import { ShareChatSheet } from "@/components/chat/share-chat-sheet";
import { Icon } from "@/components/icon";
import {
  useChatHeaderActions,
  useChatHeaderLabels,
} from "@/hooks/use-chat-header";
import { selectThread, threadSelection$ } from "@/state/thread-selection";
import { useChatCoreContext } from "@chat/chat-core";
import { useSelector } from "@legendapp/state/react";
import { Stack } from "expo-router";
import { EllipsisVertical, SquarePen } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Pressable } from "react-native";

export function useChatHeaderMenu() {
  const { threadTitle, threadId, canRename, canShare } = useChatHeaderLabels();
  const { promptRename, renameThread } = useChatHeaderActions();
  const { setPendingProjectId } = useChatCoreContext();
  const selectedThreadId = useSelector(() =>
    threadSelection$.selectedThreadId.get(),
  );
  const [renameOpen, setRenameOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const canNewChat = Boolean(selectedThreadId);

  const onNewChat = useCallback(() => {
    selectThread(undefined);
    setPendingProjectId(null);
  }, [setPendingProjectId]);

  const onRename = useCallback(() => {
    const result = promptRename();
    if (result === "modal") {
      setRenameOpen(true);
    }
  }, [promptRename]);

  const onShare = useCallback(() => {
    if (!threadId || !canShare) {
      return;
    }
    setShareOpen(true);
  }, [canShare, threadId]);

  return {
    threadTitle,
    threadId,
    canRename,
    canShare,
    canNewChat,
    renameOpen,
    setRenameOpen,
    shareOpen,
    setShareOpen,
    onRename,
    onShare,
    onNewChat,
    renameThread,
  };
}

export function ChatHeaderMenuModals({
  threadTitle,
  threadId,
  renameOpen,
  setRenameOpen,
  shareOpen,
  setShareOpen,
  renameThread,
}: ReturnType<typeof useChatHeaderMenu>) {
  return (
    <>
      <RenameChatModal
        visible={renameOpen}
        initialTitle={threadTitle === "Untitled" ? "" : threadTitle}
        onClose={() => setRenameOpen(false)}
        onSave={async (title) => {
          try {
            await renameThread(title);
          } catch {
            Alert.alert("Rename failed", "Could not update the chat title.");
          }
        }}
      />
      {threadId ? (
        <ShareChatSheet
          visible={shareOpen}
          threadId={threadId}
          threadTitle={threadTitle}
          onClose={() => setShareOpen(false)}
        />
      ) : null}
    </>
  );
}

type ChatHeaderNewChatButtonProps = {
  variant: "native" | "fallback";
  visible: boolean;
  onPress: () => void;
};

export function ChatHeaderNewChatButton({
  variant,
  visible,
  onPress,
}: ChatHeaderNewChatButtonProps) {
  if (!visible) {
    return null;
  }

  if (variant === "native") {
    return (
      <Stack.Toolbar.Button
        icon="square.and.pencil"
        onPress={onPress}
        accessibilityLabel="New chat"
      />
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="New chat"
      accessibilityRole="button"
      className="p-2 active:opacity-60"
    >
      <Icon icon={SquarePen} className="w-6 h-6 text-foreground" />
    </Pressable>
  );
}

type ChatHeaderOverflowButtonProps = {
  variant: "native" | "fallback";
  canRename: boolean;
  canShare: boolean;
  onRename: () => void;
  onShare: () => void;
};

export function ChatHeaderOverflowButton({
  variant,
  canRename,
  canShare,
  onRename,
  onShare,
}: ChatHeaderOverflowButtonProps) {
  if (!canRename && !canShare) {
    return null;
  }

  if (variant === "native") {
    return (
      <Stack.Toolbar.Menu icon="ellipsis">
        {canRename ? (
          <Stack.Toolbar.MenuAction icon="pencil" onPress={onRename}>
            Rename
          </Stack.Toolbar.MenuAction>
        ) : null}
        {canShare ? (
          <Stack.Toolbar.MenuAction
            icon="square.and.arrow.up"
            onPress={onShare}
          >
            Share
          </Stack.Toolbar.MenuAction>
        ) : null}
      </Stack.Toolbar.Menu>
    );
  }

  const onPress = () => {
    const actions = [
      ...(canRename ? [{ text: "Rename", onPress: onRename }] : []),
      ...(canShare ? [{ text: "Share", onPress: onShare }] : []),
      { text: "Cancel", style: "cancel" as const },
    ];

    Alert.alert("Chat", undefined, actions, { cancelable: true });
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Chat menu"
      accessibilityRole="button"
      className="p-2 -mr-1 active:opacity-60"
    >
      <Icon icon={EllipsisVertical} className="w-6 h-6 text-foreground" />
    </Pressable>
  );
}
