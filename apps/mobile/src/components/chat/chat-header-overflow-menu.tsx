import { RenameChatModal } from "@/components/chat/rename-chat-modal";
import { ShareChatSheet } from "@/components/chat/share-chat-sheet";
import { Icon } from "@/components/icon";
import {
  useChatHeaderActions,
  useChatHeaderLabels,
} from "@/hooks/use-chat-header";
import { selectThread, threadSelection$ } from "@/state/thread-selection";
import { useChatCoreContext } from "@chat/core";
import { useSelector } from "@legendapp/state/react";
import { Stack } from "expo-router";
import { EllipsisVertical, Pencil, Share2, SquarePen } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useChatHeaderMenu() {
  const { threadTitle, threadId, canRename, canShare } = useChatHeaderLabels();
  const { promptRename, renameThread } = useChatHeaderActions();
  const { setPendingProjectId } = useChatCoreContext();
  const selectedThreadId = useSelector(() =>
    threadSelection$.selectedThreadId.get(),
  );
  const [renameOpen, setRenameOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
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
    overflowOpen,
    setOverflowOpen,
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
  overflowOpen,
  setOverflowOpen,
  renameThread,
  canRename,
  canShare,
  onRename,
  onShare,
}: ReturnType<typeof useChatHeaderMenu>) {
  return (
    <>
      <ChatHeaderOverflowPopover
        visible={overflowOpen}
        canRename={canRename}
        canShare={canShare}
        onClose={() => setOverflowOpen(false)}
        onRename={onRename}
        onShare={onShare}
      />
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
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onRename: () => void;
  onShare: () => void;
};

export function ChatHeaderOverflowButton({
  variant,
  canRename,
  canShare,
  open,
  onOpenChange,
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
            <Stack.Toolbar.Label>Rename</Stack.Toolbar.Label>
          </Stack.Toolbar.MenuAction>
        ) : null}
        {canShare ? (
          <Stack.Toolbar.MenuAction
            icon="square.and.arrow.up"
            onPress={onShare}
          >
            <Stack.Toolbar.Label>Share</Stack.Toolbar.Label>
          </Stack.Toolbar.MenuAction>
        ) : null}
      </Stack.Toolbar.Menu>
    );
  }

  return (
    <Pressable
      onPress={() => onOpenChange(!open)}
      accessibilityLabel="Chat menu"
      accessibilityRole="button"
      className="p-2 -mr-1 active:opacity-60"
    >
      <Icon icon={EllipsisVertical} className="w-6 h-6 text-foreground" />
    </Pressable>
  );
}

type ChatHeaderOverflowPopoverProps = {
  visible: boolean;
  canRename: boolean;
  canShare: boolean;
  onClose: () => void;
  onRename: () => void;
  onShare: () => void;
};

function ChatHeaderOverflowPopover({
  visible,
  canRename,
  canShare,
  onClose,
  onRename,
  onShare,
}: ChatHeaderOverflowPopoverProps) {
  const insets = useSafeAreaInsets();

  const menuItems = [
    ...(canRename
      ? [
          {
            key: "rename",
            label: "Rename",
            icon: Pencil,
            onPress: onRename,
          },
        ]
      : []),
    ...(canShare
      ? [
          {
            key: "share",
            label: "Share",
            icon: Share2,
            onPress: onShare,
          },
        ]
      : []),
  ];

  if (!visible || menuItems.length === 0) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/8" onPress={onClose}>
        <View
          className="absolute right-4 rounded-[24px] border border-border/70 bg-card py-2 shadow-sm"
          style={{
            top: insets.top + 10,
            minWidth: 208,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.12,
            shadowRadius: 24,
            elevation: 10,
          }}
        >
          {menuItems.map((item, index) => (
            <View key={item.key}>
              {index > 0 ? <View className="mx-4 h-px bg-border/70" /> : null}
              <Pressable
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                className="flex-row items-center gap-3 px-4 py-3 active:bg-muted/70"
              >
                <Icon icon={item.icon} className="h-4.5 w-4.5 text-foreground" />
                <Text className="text-[17px] text-foreground">{item.label}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
