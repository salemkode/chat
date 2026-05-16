import { useDrawer } from "@/components/drawer-content";
import { Icon } from "@/components/icon";
import { selectThread } from "@/state/thread-selection";
import { Image } from "@/components/tw";
import { useThreads } from "@/hooks/use-threads";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Color, Stack, useRouter } from "expo-router";
import { ChevronRight, Menu, Search } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Filter = "all" | "starred";

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "Today";
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const weeks = Math.round(diffDays / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

function ChatRow({
  title,
  emoji,
  subtitle,
  onNavigate,
  onDelete,
  onStar,
  starred,
}: {
  title: string;
  emoji: string;
  subtitle: string;
  onNavigate: () => void;
  onDelete: () => void;
  onStar: () => void;
  starred: boolean;
}) {
  return (
    <Pressable
      className="flex-row items-center px-5 py-4 active:bg-card"
      onPress={onNavigate}
      onLongPress={onStar}
    >
      <Text className="text-lg mr-3">{emoji}</Text>
      <View className="flex-1 gap-0.5 mr-3">
        <Text
          numberOfLines={1}
          className="text-[17px] text-foreground dark:text-foreground"
          selectable
        >
          {title}
        </Text>
        <Text className="text-[13px] text-muted-foreground dark:text-muted-foreground">
          {subtitle}
        </Text>
      </View>
      {process.env.EXPO_OS === "ios" ? (
        <Image
          source="sf:chevron.right"
          className="w-2.5 h-4 font-medium text-muted-foreground dark:text-muted-foreground"
        />
      ) : (
        <Icon
          icon={ChevronRight}
          className="w-2.5 h-4 text-muted-foreground dark:text-muted-foreground"
        />
      )}
    </Pressable>
  );
}

function EmptySearch({ query }: { query: string }) {
  return (
    <View className="flex-1 items-center justify-center pt-32 gap-2">
      <Icon icon={Search} className="w-10 h-10 text-muted-foreground" />
      <Text className="text-[17px] text-muted-foreground text-center px-10">
        No results found for &ldquo;{query}&rdquo;
      </Text>
    </View>
  );
}

export default function ChatsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const insets = useSafeAreaInsets();
  const { threads, setPinned, deleteThread } = useThreads();

  const filtered = useMemo(() => {
    let results = threads;
    if (filter === "starred") {
      results = results.filter((t) => t.pinned);
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (t) => t.title?.toLowerCase().includes(q),
      );
    }
    return results;
  }, [search, threads, filter]);

  const handleDelete = useCallback(
    (threadId: string, title: string) => {
      Alert.alert("Delete Chat", `Delete "${title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteThread(threadId),
        },
      ]);
    },
    [deleteThread],
  );

  return (
    <>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        automaticallyAdjustsScrollIndicatorInsets
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingBottom: process.env.EXPO_OS === "android" ? insets.bottom : 0,
        }}
        renderItem={({ item }) => (
          <ChatRow
            title={item.title || "Untitled"}
            emoji={item.emoji}
            subtitle={formatTimeAgo(item.lastMessageAt)}
            starred={item.pinned}
            onNavigate={() =>
              {
                selectThread(item.id);
                router.navigate("/");
              }
            }
            onDelete={() => handleDelete(item.id, item.title || "Untitled")}
            onStar={() => setPinned(item.id, !item.pinned)}
          />
        )}
        ListEmptyComponent={search ? <EmptySearch query={search} /> : null}
      />

      <Stack.SearchBar
        placeholder="Search"
        hideWhenScrolling={false}
        onChangeText={(e) => setSearch(e.nativeEvent.text)}
        onCancelButtonPress={() => setSearch("")}
      />

      <LeftToolbar />
      <RightToolbar filter={filter} setFilter={setFilter} />
      <BottomToolbar />
    </>
  );
}

function LeftToolbar() {
  const { openDrawer } = useDrawer();

  if (process.env.EXPO_OS === "android") {
    return (
      <Stack.Toolbar placement="left" asChild>
        <Pressable
          onPress={openDrawer}
          accessibilityLabel="Open drawer"
          accessibilityRole="button"
          className="p-2 -ml-1 active:opacity-60"
        >
          <Icon icon={Menu} className="w-6 h-6 text-foreground" />
        </Pressable>
      </Stack.Toolbar>
    );
  }
  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button icon="list.bullet" onPress={openDrawer} />
    </Stack.Toolbar>
  );
}

function RightToolbar({
  filter,
  setFilter,
}: {
  filter: Filter;
  setFilter: (filter: Filter) => void;
}) {
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu icon="line.horizontal.3.decrease">
        <Stack.Toolbar.Menu inline>
          <Stack.Toolbar.MenuAction
            icon="bubble.left.and.bubble.right"
            isOn={filter === "all"}
            onPress={() => setFilter("all")}
          >
            All chats
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="star"
            isOn={filter === "starred"}
            onPress={() => setFilter("starred")}
          >
            Starred
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}

function BottomToolbar() {
  const router = useRouter();

  return (
    <Stack.Toolbar placement="bottom">
      {isLiquidGlassAvailable() && (
        <Stack.Toolbar.SearchBarSlot separateBackground />
      )}
      <Stack.Toolbar.Button
        tintColor={Color.ios.label}
        icon="square.and.pencil"
        onPress={() => {
          selectThread(undefined);
          router.navigate("/");
        }}
        separateBackground
      />
    </Stack.Toolbar>
  );
}
