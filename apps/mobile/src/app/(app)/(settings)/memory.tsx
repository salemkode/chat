import { useChatProjects, useChatThreads } from "@chat/chat-core";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
  const [scope, setScope] = useState<MemoryScope>("all");
  const [searchValue, setSearchValue] = useState("");

  const userMemories = useQuery(api.functions.memory.listUserMemories, {
    paginationOpts: { cursor: null, numItems: 200 },
  });
  const threadMemories = useQuery(api.functions.memory.listThreadMemories, {
    paginationOpts: { cursor: null, numItems: 200 },
  });
  const projectMemories = useQuery(api.functions.memory.listProjectMemories, {
    paginationOpts: { cursor: null, numItems: 200 },
  });

  const allMemories = useMemo<MemoryItem[]>(() => {
    return [
      ...(userMemories?.page ?? []).map((memory) => ({
        ...memory,
        scope: "user" as const,
      })),
      ...(threadMemories?.page ?? []).map((memory) => ({
        ...memory,
        scope: "thread" as const,
      })),
      ...(projectMemories?.page ?? []).map((memory) => ({
        ...memory,
        scope: "project" as const,
      })),
    ].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [projectMemories?.page, threadMemories?.page, userMemories?.page]);

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
    userMemories === undefined ||
    threadMemories === undefined ||
    projectMemories === undefined;

  const displayedMemories = filteredMemories.slice(0, 50);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10"
    >
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
        className="bg-muted rounded-xl px-4 py-3 text-[15px] text-foreground mt-4"
        style={{ borderCurve: "continuous" }}
      />

      {isLoading ? (
        <View className="py-12 items-center">
          <ActivityIndicator />
        </View>
      ) : displayedMemories.length === 0 ? (
        <Text className="text-[15px] text-muted-foreground text-center py-12">
          No memories match this filter.
        </Text>
      ) : (
        <View className="gap-3 mt-4">
          {displayedMemories.map((memory) => (
            <View
              key={`${memory.scope}:${memory.memoryId}`}
              className="rounded-xl border border-border bg-card px-4 py-3"
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
          ))}
        </View>
      )}
    </ScrollView>
  );
}
