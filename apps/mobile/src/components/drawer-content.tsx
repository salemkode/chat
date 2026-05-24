import "@/global.css";

import { Icon } from "@/components/icon";
import { TouchableGlass } from "@/components/touchable-glass";
import { SafeAreaView } from "@/components/tw";
import { InfiniteScrollFooter } from "@/components/infinite-scroll-footer";
import {
  DrawerSearchBar,
  DrawerSearchResults,
} from "@/components/drawer/drawer-sidebar-search";
import { DrawerThreadRow } from "@/components/drawer/drawer-thread-row";
import { useSidebarSearch } from "@/hooks/use-sidebar-search";
import { useViewer } from "@/hooks/use-viewer";
import { selectThread, threadSelection$ } from "@/state/thread-selection";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { LegendList } from "@legendapp/list/react-native";
import { useSelector } from "@legendapp/state/react";
import { useChatProjects, useChatThreads, useChatCoreContext } from "@chat/chat-core";
import type { ProjectSummary, ThreadSummary } from "@chat/chat-core/types";
import type { Href } from "expo-router";
import {
  FolderOpen,
  Folder,
  Plus,
  SquarePen,
} from "lucide-react-native";
import React, {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type DrawerListRow =
  | { kind: "loading" }
  | { kind: "projectsHeader" }
  | { kind: "project"; project: ProjectSummary }
  | { kind: "projectsLoading" }
  | { kind: "divider" }
  | { kind: "thread"; thread: ThreadSummary }
  | { kind: "threadsLoading" };

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

function DrawerHeader({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <View className="px-4 pt-2 pb-1">
      <View className="flex-row items-center justify-between">
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

function DrawerProjectSection({
  project,
  threads,
  isExpanded,
  onToggle,
  onThreadPress,
  onThreadPin,
  onThreadRemoveFromProject,
  onThreadDelete,
  onNewChatInProject,
  selectedThreadId,
}: {
  project: ProjectSummary;
  threads: ThreadSummary[];
  isExpanded: boolean;
  onToggle: () => void;
  onThreadPress: (thread: ThreadSummary) => void;
  onThreadPin: (thread: ThreadSummary) => void;
  onThreadRemoveFromProject: (thread: ThreadSummary) => void;
  onThreadDelete: (thread: ThreadSummary) => void;
  onNewChatInProject: () => void;
  selectedThreadId: string | undefined;
}) {
  return (
    <View className="mb-1">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center px-4 py-2 mx-2 rounded-[8px] active:bg-accent gap-1"
      >
        <Icon
          icon={isExpanded ? FolderOpen : Folder}
          className="w-4 h-4 shrink-0 text-muted-foreground pr-1"
        />
        <Text
          numberOfLines={1}
          className="flex-1 text-[13px] font-semibold text-foreground/80 pr-2"
        >
          {project.name}
        </Text>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onNewChatInProject();
          }}
          hitSlop={8}
          className="h-6 flex-row items-center gap-0.5 rounded-full px-1.5 active:bg-accent"
        >
          <Text className="text-[11px] tabular-nums text-muted-foreground">
            {threads.length > 0 ? threads.length : project.threadCount}
          </Text>
          <Icon icon={Plus} className="w-3.5 h-3.5 text-muted-foreground" />
        </Pressable>
      </Pressable>
      {isExpanded &&
        threads.map((thread) => (
          <DrawerThreadRow
            key={thread.id}
            thread={thread}
            nested
            active={selectedThreadId === thread.id}
            onPress={() => onThreadPress(thread)}
            onPin={() => onThreadPin(thread)}
            onRemoveFromProject={() => onThreadRemoveFromProject(thread)}
            onDelete={() => onThreadDelete(thread)}
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
      <Pressable
        onPress={onNewChat}
        accessibilityLabel="New chat"
        accessibilityRole="button"
        className="w-10 h-10 rounded-full bg-foreground active:opacity-80 items-center justify-center"
      >
        <Icon
          icon={SquarePen}
          className="w-5 h-5"
          colorClassName="accent-background"
        />
      </Pressable>
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
          onPress: (name?: string) => {
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
  const {
    projects,
    createProject,
    isLoading: isLoadingProjects,
    hasMore: hasMoreProjects,
    isLoadingMore: isLoadingMoreProjects,
    loadMore: loadMoreProjects,
  } = useChatProjects();
  const {
    threadsByProject,
    unfiledThreads,
    setPinned,
    deleteThread,
    isLoading,
    hasMore: hasMoreThreads,
    isLoadingMore: isLoadingMoreThreads,
    loadMore: loadMoreThreads,
  } = useChatThreads();
  const { setPendingProjectId } = useChatCoreContext();
  const viewer = useViewer();
  const selectedThreadId = useSelector(() =>
    threadSelection$.selectedThreadId.get(),
  );
  const [error, setError] = useState<string | null>(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState<
    Record<string, boolean>
  >({});
  const [searchActive, setSearchActive] = useState(false);
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    error: searchError,
    isSearching,
    reset: resetSearch,
  } = useSidebarSearch(searchActive);
  const removeThreadFromProject = useMutation(api.projects.removeThreadFromProject);

  const clearError = useCallback(() => setError(null), []);

  const showCreateProject = useProjectCreateDialog(createProject);

  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjectIds((prev) => ({
      ...prev,
      [projectId]: !(prev[projectId] ?? true),
    }));
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

  const handleRemoveFromProject = useCallback(
    (thread: ThreadSummary) => {
      if (!thread.projectId) {
        return;
      }
      Alert.alert(
        "Remove from project",
        `Remove "${thread.title || "Untitled"}" from ${thread.projectName ?? "this project"}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              removeThreadFromProject({ threadId: thread.id })
                .then(clearError)
                .catch(() => setError("Failed to remove chat from project"));
            },
          },
        ],
      );
    },
    [removeThreadFromProject, clearError],
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
      setPendingProjectId(null);
      onNavigate("/");
    },
    [onNavigate, setPendingProjectId],
  );

  const handleCancelSearch = useCallback(() => {
    setSearchActive(false);
    resetSearch();
  }, [resetSearch]);

  const handleSelectSearchResult = useCallback(
    (threadId: string) => {
      selectThread(threadId);
      setPendingProjectId(null);
      handleCancelSearch();
      onNavigate("/");
    },
    [handleCancelSearch, onNavigate, setPendingProjectId],
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
  const drawerRows = useMemo<DrawerListRow[]>(() => {
    if (isLoading || isLoadingProjects) {
      return [{ kind: "loading" }];
    }

    const rows: DrawerListRow[] = [];
    if (hasProjects) {
      rows.push({ kind: "projectsHeader" });
      rows.push(...projects.map((project) => ({ kind: "project", project }) satisfies DrawerListRow));
      if (isLoadingMoreProjects) {
        rows.push({ kind: "projectsLoading" });
      }
      if (unfiledThreads.length > 0) {
        rows.push({ kind: "divider" });
      }
    }

    rows.push(...unfiledThreads.map((thread) => ({ kind: "thread", thread }) satisfies DrawerListRow));
    if (isLoadingMoreThreads) {
      rows.push({ kind: "threadsLoading" });
    }

    return rows;
  }, [
    hasProjects,
    isLoading,
    isLoadingProjects,
    isLoadingMoreProjects,
    isLoadingMoreThreads,
    projects,
    unfiledThreads,
  ]);

  const hasMoreDrawerRows = hasMoreProjects || hasMoreThreads;
  const isLoadingMoreDrawerRows = isLoadingMoreProjects || isLoadingMoreThreads;
  const loadMoreDrawerRows = useCallback(() => {
    if (hasMoreProjects && !isLoadingMoreProjects) {
      loadMoreProjects(30);
      return;
    }
    if (hasMoreThreads && !isLoadingMoreThreads) {
      loadMoreThreads(30);
    }
  }, [
    hasMoreProjects,
    hasMoreThreads,
    isLoadingMoreProjects,
    isLoadingMoreThreads,
    loadMoreProjects,
    loadMoreThreads,
  ]);

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left"]}>
      <DrawerHeader onCreateProject={showCreateProject} />

      <View className="px-4 pb-3">
        <DrawerSearchBar
          active={searchActive}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onActivate={() => setSearchActive(true)}
          onCancel={handleCancelSearch}
        />
      </View>

      {error && (
        <DrawerErrorBanner message={error} onDismiss={clearError} />
      )}

      <LegendList
        className="flex-1"
        data={searchActive ? [] : drawerRows}
        keyExtractor={(item) => {
          switch (item.kind) {
            case "loading":
              return "loading";
            case "projectsHeader":
              return "projectsHeader";
            case "project":
              return `project:${item.project.id}`;
            case "projectsLoading":
              return "projectsLoading";
            case "divider":
              return "divider";
            case "thread":
              return `thread:${item.thread.id}`;
            case "threadsLoading":
              return "threadsLoading";
          }
        }}
        estimatedItemSize={52}
        contentContainerStyle={{ paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
        maintainVisibleContentPosition={{
          data: true,
          size: true,
        }}
        onEndReached={
          !searchActive && hasMoreDrawerRows && !isLoadingMoreDrawerRows
            ? loadMoreDrawerRows
            : undefined
        }
        onEndReachedThreshold={0.35}
        renderItem={({ item }) => {
          switch (item.kind) {
            case "loading":
              return <DrawerLoadingRow />;
            case "projectsHeader":
              return (
                <Text className="text-[13px] font-semibold text-foreground/70 px-6 pt-5 pb-1.5">
                  Projects
                </Text>
              );
            case "project": {
              const projectThreads = threadsByProject.get(item.project.id) ?? [];
              const isExpanded = expandedProjectIds[item.project.id] ?? true;
              return (
                <DrawerProjectSection
                  project={item.project}
                  threads={projectThreads}
                  isExpanded={isExpanded}
                  onToggle={() => toggleProject(item.project.id)}
                  onThreadPress={handleThreadPress}
                  onThreadPin={handlePin}
                  onThreadRemoveFromProject={handleRemoveFromProject}
                  onThreadDelete={confirmDelete}
                  onNewChatInProject={() => handleNewChatInProject(item.project.id)}
                  selectedThreadId={selectedThreadId}
                />
              );
            }
            case "projectsLoading":
              return (
                <InfiniteScrollFooter
                  isLoadingMore={isLoadingMoreProjects}
                  label="Loading more projects..."
                />
              );
            case "divider":
              return <View className="mx-6 my-2 border-b border-border" />;
            case "thread":
              return (
                <DrawerThreadRow
                  thread={item.thread}
                  active={selectedThreadId === item.thread.id}
                  onPress={() => handleThreadPress(item.thread)}
                  onPin={() => handlePin(item.thread)}
                  onDelete={() => confirmDelete(item.thread)}
                />
              );
            case "threadsLoading":
              return (
                <InfiniteScrollFooter
                  isLoadingMore={isLoadingMoreThreads}
                  label="Loading more chats..."
                />
              );
          }
        }}
        ListHeaderComponent={
          searchActive ? (
          <DrawerSearchResults
            query={searchQuery}
            isSearching={isSearching}
            error={searchError}
            results={searchResults}
            onSelectThread={handleSelectSearchResult}
          />
        ) : null
        }
        ListEmptyComponent={
          !searchActive && !isLoading && !isLoadingProjects ? (
            <DrawerEmptyState onNewChat={handleNewChat} />
          ) : null
        }
      />

      <DrawerFooter
        viewerInitials={userInitials}
        viewerName={viewer?.name || "Loading..."}
        onSettings={() => onOpenModal("/(settings)/settings" as Href)}
        onNewChat={handleNewChat}
      />

    </SafeAreaView>
  );
}
