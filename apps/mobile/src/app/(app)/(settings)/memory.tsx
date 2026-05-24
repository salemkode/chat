import { useChatProjects, useChatThreads } from "@chat/chat-core";
import { api } from "@convex/_generated/api";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { sortedCopy } from "@/lib/sorted-copy";
import { InfiniteScrollFooter } from "@/components/infinite-scroll-footer";
import { LegendList } from "@legendapp/list/react-native";
import { Check } from "lucide-react-native";
import { Icon } from "@/components/icon";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

type MemoryScope = "all" | "user" | "thread" | "project";

type MemoryItem = {
  memoryId: string;
  title: string;
  content: string;
  category?: string;
  source: string;
  tags?: string[];
  threadId?: string;
  projectId?: string;
  updatedAt: number;
  scope: "user" | "thread" | "project";
};

function formatRelativeTime(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function MemorySettingsScreen() {
  const { threads } = useChatThreads();
  const { projects } = useChatProjects();
  const { settings, updateSettings } = useSettings();
  const [scope, setScope] = useState<MemoryScope>("all");
  const [searchValue, setSearchValue] = useState("");

  const auxiliaryCandidates = useQuery(api.auxiliaryModels.listAuxiliaryModelCandidates, {});

  const selectedAuxiliaryModelId = useMemo(() => {
    const candidates = auxiliaryCandidates ?? [];
    if (
      settings?.auxiliaryModelId &&
      candidates.some((candidate) => candidate.modelDocId === settings.auxiliaryModelId)
    ) {
      return settings.auxiliaryModelId;
    }
    return candidates.find((candidate) => candidate.isRecommended)?.modelDocId;
  }, [auxiliaryCandidates, settings?.auxiliaryModelId]);

  const userMemories = usePaginatedQuery(
    api.functions.memory.listUserMemories,
    {},
    { initialNumItems: 25 },
  );
  const threadMemories = usePaginatedQuery(
    api.functions.memory.listThreadMemories,
    {},
    { initialNumItems: 25 },
  );
  const projectMemories = usePaginatedQuery(
    api.functions.memory.listProjectMemories,
    {},
    { initialNumItems: 25 },
  );

  const allMemories = useMemo<MemoryItem[]>(() => {
    return sortedCopy([
      ...(userMemories.results ?? []).map((memory) => ({
        ...memory,
        scope: "user" as const,
      })),
      ...(threadMemories.results ?? []).map((memory) => ({
        ...memory,
        scope: "thread" as const,
      })),
      ...(projectMemories.results ?? []).map((memory) => ({
        ...memory,
        scope: "project" as const,
      })),
    ], (a, b) => b.updatedAt - a.updatedAt);
  }, [projectMemories.results, threadMemories.results, userMemories.results]);

  const filteredMemories = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();
    return allMemories.filter((memory) => {
      if (scope !== "all" && memory.scope !== scope) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [
        memory.title,
        memory.content,
        memory.category,
        memory.source,
        ...(memory.tags ?? []),
        memory.threadId
          ? threads.find((thread) => thread.id === memory.threadId)?.title
          : null,
        memory.projectId
          ? projects.find((project) => project.id === memory.projectId)?.name
          : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [allMemories, projects, scope, searchValue, threads]);

  const isLoading =
    userMemories.results === undefined ||
    threadMemories.results === undefined ||
    projectMemories.results === undefined;
  const hasMore =
    userMemories.status === "CanLoadMore" ||
    threadMemories.status === "CanLoadMore" ||
    projectMemories.status === "CanLoadMore" ||
    userMemories.status === "LoadingMore" ||
    threadMemories.status === "LoadingMore" ||
    projectMemories.status === "LoadingMore";
  const isLoadingMore =
    userMemories.status === "LoadingMore" ||
    threadMemories.status === "LoadingMore" ||
    projectMemories.status === "LoadingMore";

  function loadMoreForScope() {
    if (scope === "user" || scope === "all") {
      userMemories.loadMore(25);
    }
    if (scope === "thread" || scope === "all") {
      threadMemories.loadMore(25);
    }
    if (scope === "project" || scope === "all") {
      projectMemories.loadMore(25);
    }
  }

  return (
    <LegendList
      className="flex-1 bg-background"
      data={isLoading ? [] : filteredMemories}
      keyExtractor={(item) => `${item.scope}:${item.memoryId}`}
      estimatedItemSize={156}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10"
      onEndReached={hasMore && !isLoadingMore ? loadMoreForScope : undefined}
      onEndReachedThreshold={0.35}
      renderItem={({ item: memory }) => (
        <View
          className="mb-3 rounded-xl border border-border bg-card px-4 py-3"
          style={{ borderCurve: "continuous" }}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-foreground">
                {memory.title}
              </Text>
              <Text className="text-[12px] text-muted-foreground mt-1 uppercase">
                {memory.scope}
                {memory.category ? ` · ${memory.category}` : ""}
              </Text>
            </View>
            <Text className="text-[12px] text-muted-foreground">
              {formatRelativeTime(memory.updatedAt)}
            </Text>
          </View>
          <Text
            className="text-[14px] text-muted-foreground mt-2 leading-relaxed"
            numberOfLines={4}
          >
            {memory.content}
          </Text>
        </View>
      )}
      ListHeaderComponent={
        <>
          <Text className="text-[13px] text-muted-foreground pt-6 pb-2">
            Background memory model
          </Text>
          <Text className="text-[13px] text-muted-foreground pb-3 leading-relaxed">
            Used when your chat model does not support tools. Pick a small, fast model to save cost.
          </Text>
          {(auxiliaryCandidates ?? []).map((candidate) => {
            const selected = selectedAuxiliaryModelId === candidate.modelDocId;
            const costHint =
              candidate.estimatedCostPerExtraction != null
                ? ` (~$${candidate.estimatedCostPerExtraction.toFixed(4)}/run)`
                : "";
            return (
              <Pressable
                key={candidate.modelDocId}
                onPress={() =>
                  void updateSettings({
                    auxiliaryModelId: candidate.modelDocId,
                  })
                }
                className="flex-row items-center px-1 py-3 gap-3 active:bg-muted"
              >
                <View className="w-5 items-center">
                  {selected ? (
                    <Icon icon={Check} className="w-5 h-5 text-foreground" />
                  ) : null}
                </View>
                <Text className="text-[17px] text-foreground flex-1">
                  {candidate.displayName}
                  {costHint}
                </Text>
              </Pressable>
            );
          })}

          <View className="flex-row flex-wrap gap-2 mt-4">
            {(
              [
                ["all", "All"],
                ["user", "User"],
                ["thread", "Thread"],
                ["project", "Project"],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setScope(value)}
                className={`px-3 py-1.5 rounded-full border ${
                  scope === value ? "border-foreground bg-muted" : "border-border"
                }`}
              >
                <Text className="text-[13px] text-foreground">{label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder="Search memories…"
            placeholderTextColor="#999"
            className="bg-muted rounded-xl px-4 py-3 text-[15px] text-foreground mt-4 mb-4"
            style={{ borderCurve: "continuous" }}
          />
        </>
      }
      ListEmptyComponent={
        isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator />
          </View>
        ) : (
          <Text className="text-[15px] text-muted-foreground text-center py-12">
            No memories match this filter.
          </Text>
        )
      }
      ListFooterComponent={
        <InfiniteScrollFooter
          isLoadingMore={isLoadingMore}
          label="Loading more memories..."
        />
      }
    />
  );
}
