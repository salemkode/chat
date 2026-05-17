import "@/global.css";

import { Icon } from "@/components/icon";
import { TouchableGlass } from "@/components/touchable-glass";
import { SafeAreaView } from "@/components/tw";
import { useViewer } from "@/hooks/use-viewer";
import { selectThread, threadSelection$ } from "@/state/thread-selection";
import { cn } from "@/utils/tailwind";
import { useSelector } from "@legendapp/state/react";
import { useChatProjects, useChatThreads, useChatCoreContext } from "@chat/chat-core";
import type { ProjectSummary, ThreadSummary } from "@chat/chat-core/types";
import type { Href } from "expo-router";
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  Pin,
  Plus,
} from "lucide-react-native";
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

function DrawerHeader({
  onCreateProject,
}: {
  onCreateProject: () => void;
}) {
  return (
    <View className="px-4 pt-2 pb-3 flex-row items-center justify-between">
      <Text className="text-[28px] font-bold text-foreground">Chat</Text>
      <Pressable
        onPress={onCreateProject}
        className="px-2.5 py-1 rounded-[8px] active:bg-accent flex-row items-center gap-1"
      >
        <Icon icon={Folder} className="w-3.5 h-3.5 text-muted-foreground" />
        <Text className="text-[13px] text-muted-foreground font-medium">
          New Project
        </Text>
      </Pressable>
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

function DrawerProjectSection({
  project,
  threads,
  isExpanded,
  onToggle,
  onThreadPress,
  onThreadLongPress,
  onNewChatInProject,
  selectedThreadId,
}: {
  project: ProjectSummary;
  threads: ThreadSummary[];
  isExpanded: boolean;
  onToggle: () => void;
  onThreadPress: (thread: ThreadSummary) => void;
  onThreadLongPress: (thread: ThreadSummary) => void;
  onNewChatInProject: () => void;
  selectedThreadId: string | undefined;
}) {
  return (
    <View className="mb-1">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center px-4 py-2 mx-2 rounded-[8px] active:bg-accent"
      >
        <Icon
          icon={isExpanded ? ChevronDown : ChevronRight}
          className="w-4 h-4 text-muted-foreground mr-1"
        />
        <Icon
          icon={isExpanded ? FolderOpen : Folder}
          className="w-4 h-4 text-muted-foreground mr-2"
        />
        <Text
          numberOfLines={1}
          className="flex-1 text-[13px] font-semibold text-foreground/80"
        >
          {project.name}
        </Text>
        <View className="px-1.5 py-0.5 rounded-full bg-muted mr-1.5">
          <Text className="text-[11px] text-muted-foreground">
            {threads.length}
          </Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onNewChatInProject();
          }}
          hitSlop={8}
          className="w-6 h-6 rounded-full items-center justify-center active:bg-accent"
        >
          <Icon icon={Plus} className="w-3.5 h-3.5 text-muted-foreground" />
        </Pressable>
      </Pressable>
      {isExpanded &&
        threads.map((thread) => (
          <DrawerThreadRow
            key={thread.id}
            thread={thread}
            active={selectedThreadId === thread.id}
            onPress={() => onThreadPress(thread)}
            onLongPress={() => onThreadLongPress(thread)}
          />
        ))}
    </View>
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

function useProjectCreateDialog(createProject: (args: { name: string; description?: string }) => Promise<unknown>) {
  return useCallback(() => {
    Alert.prompt(
      "New Project",
      "Enter a name for your project",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: (name) => {
            const trimmed = name?.trim();
            if (trimmed) {
              createProject({ name: trimmed }).catch(() => {});
            }
          },
        },
      ],
      "plain-text",
    );
  }, [createProject]);
}

export function DrawerContent({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (path: Href) => void;
  onOpenModal: (path: Href) => void;
}) {
  const { projects, createProject } = useChatProjects();
  const {
    threadsByProject,
    unfiledThreads,
    setPinned,
    deleteThread,
    isLoading,
  } = useChatThreads();
  const { setPendingProjectId } = useChatCoreContext();
  const viewer = useViewer();
  const selectedThreadId = useSelector(() =>
    threadSelection$.selectedThreadId.get(),
  );
  const [error, setError] = useState<string | null>(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(
    () => new Set(),
  );

  const clearError = useCallback(() => setError(null), []);

  const showCreateProject = useProjectCreateDialog(createProject);

  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

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
    setPendingProjectId(null);
    onNavigate("/");
  }, [onNavigate, setPendingProjectId]);

  const handleNewChatInProject = useCallback(
    (projectId: string) => {
      selectThread(undefined);
      setPendingProjectId(projectId);
      onNavigate("/");
    },
    [onNavigate, setPendingProjectId],
  );

  const handleThreadPress = useCallback(
    (thread: ThreadSummary) => {
      selectThread(thread.id);
      onNavigate("/");
    },
    [onNavigate],
  );

  const userInitials = viewer?.name
    ? viewer.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  const hasProjects = projects.length > 0;

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left"]}>
      <DrawerHeader onCreateProject={showCreateProject} />

      {error && (
        <DrawerErrorBanner message={error} onDismiss={clearError} />
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {isLoading ? (
          <DrawerLoadingRow />
        ) : threadsByProject.size === 0 && unfiledThreads.length === 0 ? (
          <DrawerEmptyState onNewChat={handleNewChat} />
        ) : (
          <>
            {hasProjects && (
              <Text className="text-[13px] font-semibold text-foreground/70 px-6 pt-5 pb-1.5">
                Projects
              </Text>
            )}
            {hasProjects &&
              projects.map((project) => {
                const projectThreads =
                  threadsByProject.get(project.id) ?? [];
                if (projectThreads.length === 0) return null;
                const isExpanded = expandedProjectIds.has(project.id);
                return (
                  <DrawerProjectSection
                    key={project.id}
                    project={project}
                    threads={projectThreads}
                    isExpanded={isExpanded}
                    onToggle={() => toggleProject(project.id)}
                    onThreadPress={handleThreadPress}
                    onThreadLongPress={handleLongPress}
                    onNewChatInProject={() =>
                      handleNewChatInProject(project.id)
                    }
                    selectedThreadId={selectedThreadId}
                  />
                );
              })}

            {hasProjects && (
              <View className="mx-6 my-2 border-b border-border" />
            )}

            {hasProjects && (
              <Text className="text-[13px] font-semibold text-foreground/70 px-6 pt-1 pb-1.5">
                Unfiled
              </Text>
            )}
            {(!hasProjects || unfiledThreads.length > 0) &&
              unfiledThreads.map((thread) => (
                <DrawerThreadRow
                  key={thread.id}
                  thread={thread}
                  active={selectedThreadId === thread.id}
                  onPress={() => handleThreadPress(thread)}
                  onLongPress={() => handleLongPress(thread)}
                />
              ))}
            {!hasProjects && unfiledThreads.length === 0 && (
              <DrawerEmptyState onNewChat={handleNewChat} />
            )}
          </>
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
