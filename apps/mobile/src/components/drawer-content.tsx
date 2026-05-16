import "@/global.css";

import { Icon } from "@/components/icon";
import { TouchableGlass } from "@/components/touchable-glass";
import { SafeAreaView } from "@/components/tw";
import { useThreads, type ThreadSummary } from "@/hooks/use-threads";
import { useViewer } from "@/hooks/use-viewer";
import { selectThread, threadSelection$ } from "@/state/thread-selection";
import { cn } from "@/utils/tailwind";
import { useSelector } from "@legendapp/state/react";
import type { Href } from "expo-router";
import { Pin, Plus } from "lucide-react-native";
import React, {
  createContext,
  use,
  useCallback,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type DrawerContextValue = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextValue | null>(null);

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);

  return (
    <DrawerContext value={{ isOpen, openDrawer, closeDrawer }}>
      {children}
    </DrawerContext>
  );
}

export function useDrawer() {
  const context = use(DrawerContext);
  if (!context) {
    throw new Error("useDrawer must be used within a DrawerProvider");
  }
  return context;
}

function DrawerHeader() {
  return (
    <View className="px-4 pt-2 pb-3">
      <Text className="text-[28px] font-bold text-foreground">Chat</Text>
    </View>
  );
}

function DrawerErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <Pressable
      onPress={onDismiss}
      className="mx-4 mb-2 px-3 py-2 rounded-[10px] bg-muted active:bg-accent"
    >
      <Text className="text-[13px] text-red-500">{message}</Text>
    </Pressable>
  );
}

function DrawerThreadRow({
  thread,
  active,
  onPress,
  onLongPress,
}: {
  thread: ThreadSummary;
  active: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className={cn(
        "flex-row items-center px-4 py-2.5 mx-2 rounded-[10px] active:bg-accent",
        active && "bg-accent",
      )}
    >
      <Text numberOfLines={1} className="text-[15px] mr-2">
        {thread.emoji}
      </Text>
      <Text
        numberOfLines={1}
        className={cn(
          "flex-1 text-[15px]",
          active ? "text-foreground font-medium" : "text-foreground/85",
        )}
      >
        {thread.title || "Untitled"}
      </Text>
      {thread.pinned && (
        <Icon
          icon={Pin}
          className="w-3 h-3 text-muted-foreground"
          strokeWidth={2.5}
        />
      )}
    </Pressable>
  );
}

function DrawerLoadingRow() {
  return (
    <View className="items-center py-6">
      <ActivityIndicator size="small" />
    </View>
  );
}

function DrawerEmptyState({ onNewChat }: { onNewChat: () => void }) {
  return (
    <View className="items-center py-8 px-6 gap-2">
      <Text className="text-[15px] text-muted-foreground text-center">
        No chats yet
      </Text>
      <Pressable
        onPress={onNewChat}
        className="px-3 py-1.5 rounded-[10px] bg-accent active:bg-accent/80"
      >
        <Text className="text-[14px] text-foreground font-medium">
          New chat
        </Text>
      </Pressable>
    </View>
  );
}

function DrawerFooter({
  viewerInitials,
  viewerName,
  onSettings,
  onNewChat,
}: {
  viewerInitials: string;
  viewerName: string;
  onSettings: () => void;
  onNewChat: () => void;
}) {
  return (
    <View
      className="flex-row items-center px-4 py-3 border-t border-border"
      style={{ borderTopWidth: StyleSheet.hairlineWidth }}
    >
      <TouchableGlass
        onPress={onSettings}
        className="rounded-full p-2 flex-row items-center gap-2.5 active:opacity-60"
      >
        <View className="w-8 h-8 rounded-full bg-card items-center justify-center">
          <Text className="text-[13px] font-semibold text-foreground">
            {viewerInitials}
          </Text>
        </View>
        <Text className="text-sm text-foreground">{viewerName}</Text>
      </TouchableGlass>
      <View className="flex-1" />
      <TouchableGlass
        onPress={onNewChat}
        className="w-10 h-10 rounded-full bg-foreground active:bg-muted items-center justify-center"
      >
        <Icon icon={Plus} className="w-6 h-6 text-background" />
      </TouchableGlass>
    </View>
  );
}

export function DrawerContent({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (path: Href) => void;
  onOpenModal: (path: Href) => void;
}) {
  const { threads, setPinned, deleteThread, isLoading } = useThreads();
  const viewer = useViewer();
  const selectedThreadId = useSelector(() =>
    threadSelection$.selectedThreadId.get(),
  );
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const handlePin = useCallback(
    (thread: ThreadSummary) => {
      setPinned(thread.id, !thread.pinned)
        .then(clearError)
        .catch(() =>
          setError(`Failed to ${thread.pinned ? "unpin" : "pin"} chat`),
        );
    },
    [setPinned, clearError],
  );

  const confirmDelete = useCallback(
    (thread: ThreadSummary) => {
      Alert.alert(
        "Delete Chat",
        `Delete "${thread.title || "Untitled"}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteThread(thread.id)
                .then(() => {
                  if (selectedThreadId === thread.id) {
                    selectThread(undefined);
                    onNavigate("/");
                  }
                  clearError();
                })
                .catch(() => setError("Failed to delete chat"));
            },
          },
        ],
      );
    },
    [deleteThread, selectedThreadId, onNavigate, clearError],
  );

  const handleLongPress = useCallback(
    (thread: ThreadSummary) => {
      Alert.alert(
        thread.title || "Untitled",
        undefined,
        [
          {
            text: thread.pinned ? "Unpin" : "Pin",
            onPress: () => handlePin(thread),
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => confirmDelete(thread),
          },
          { text: "Cancel", style: "cancel" },
        ],
        { cancelable: true },
      );
    },
    [handlePin, confirmDelete],
  );

  const handleNewChat = useCallback(() => {
    selectThread(undefined);
    onNavigate("/");
  }, [onNavigate]);

  const userInitials = viewer?.name
    ? viewer.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left"]}>
      <DrawerHeader />

      {error && (
        <DrawerErrorBanner message={error} onDismiss={clearError} />
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        <Text className="text-[13px] font-semibold text-foreground/70 px-6 pt-5 pb-1.5">
          Recents
        </Text>
        {isLoading ? (
          <DrawerLoadingRow />
        ) : threads.length === 0 ? (
          <DrawerEmptyState onNewChat={handleNewChat} />
        ) : (
          threads.slice(0, 20).map((thread) => (
            <DrawerThreadRow
              key={thread.id}
              thread={thread}
              active={selectedThreadId === thread.id}
              onPress={() => {
                selectThread(thread.id);
                onNavigate("/");
              }}
              onLongPress={() => handleLongPress(thread)}
            />
          ))
        )}
      </ScrollView>

      <DrawerFooter
        viewerInitials={userInitials}
        viewerName={viewer?.name || "Loading..."}
        onSettings={() => onOpenModal("/(settings)/settings")}
        onNewChat={handleNewChat}
      />
    </SafeAreaView>
  );
}
