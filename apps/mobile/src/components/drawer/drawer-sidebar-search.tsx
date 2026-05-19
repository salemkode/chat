import { Icon } from "@/components/icon";
import type { SidebarSearchResult } from "@/hooks/use-sidebar-search";
import { Search, X } from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export function DrawerSearchBar({
  active,
  query,
  onQueryChange,
  onActivate,
  onCancel,
}: {
  active: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onActivate: () => void;
  onCancel: () => void;
}) {
  if (!active) {
    return (
      <Pressable
        onPress={onActivate}
        className="mt-3 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 active:bg-muted"
        style={{ borderCurve: "continuous" }}
      >
        <Icon icon={Search} className="w-4 h-4 text-muted-foreground" />
        <Text className="text-[15px] text-muted-foreground">Search chats</Text>
      </Pressable>
    );
  }

  return (
    <View
      className="mt-3 flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5"
      style={{ borderCurve: "continuous" }}
    >
      <Icon icon={Search} className="w-4 h-4 text-muted-foreground" />
      <TextInput
        value={query}
        onChangeText={onQueryChange}
        autoFocus
        placeholder="Search across your chats"
        placeholderTextColor="#999"
        className="flex-1 py-2 text-[15px] text-foreground"
        returnKeyType="search"
      />
      <Pressable
        onPress={onCancel}
        hitSlop={8}
        className="w-8 h-8 rounded-full items-center justify-center active:bg-muted"
      >
        <Icon icon={X} className="w-4 h-4 text-muted-foreground" />
      </Pressable>
    </View>
  );
}

export function DrawerSearchResults({
  query,
  isSearching,
  error,
  results,
  onSelectThread,
}: {
  query: string;
  isSearching: boolean;
  error: string | null;
  results: SidebarSearchResult[];
  onSelectThread: (threadId: string) => void;
}) {
  if (isSearching) {
    return (
      <View className="flex-row items-center justify-center gap-2 py-12">
        <ActivityIndicator />
        <Text className="text-[15px] text-muted-foreground">
          Searching conversations…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <Text className="text-[15px] text-red-500 text-center py-12 px-6">
        {error}
      </Text>
    );
  }

  if (!query.trim()) {
    return (
      <Text className="text-[15px] text-muted-foreground text-center py-12 px-6">
        Type to search across your chat history.
      </Text>
    );
  }

  if (results.length === 0) {
    return (
      <Text className="text-[15px] text-muted-foreground text-center py-12 px-6">
        No matching chats found.
      </Text>
    );
  }

  return (
    <>
      {results.map((result) => (
        <Pressable
          key={result.messageId}
          onPress={() => onSelectThread(result.threadId)}
          className="px-4 py-3 mx-2 rounded-[10px] active:bg-accent"
        >
          <Text className="text-[15px] font-medium text-foreground">
            {result.threadTitle}
          </Text>
          {result.projectName ? (
            <Text className="text-[12px] text-muted-foreground mt-0.5">
              in {result.projectName}
            </Text>
          ) : null}
          <Text
            className="text-[14px] text-muted-foreground mt-1.5 leading-relaxed"
            numberOfLines={2}
          >
            {result.snippet}
          </Text>
        </Pressable>
      ))}
    </>
  );
}
