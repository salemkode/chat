import { Icon } from "@/components/icon";
import { DRAWER_THREAD_ROW_HEIGHT } from "@/components/drawer/drawer-thread-row-layout";
import { cn } from "@/utils/tailwind";
import type { ThreadSummary } from "@chat/chat-core/types";
import { Pin } from "lucide-react-native";
import { Pressable, Text } from "react-native";

export function DrawerThreadRowTrigger({
  thread,
  active,
  onPress,
  onLongPress,
}: {
  thread: ThreadSummary;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ height: DRAWER_THREAD_ROW_HEIGHT }}
      className={cn(
        "flex-row items-center px-4 py-2.5 rounded-[10px] active:bg-accent",
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
      {thread.pinned ? (
        <Icon
          icon={Pin}
          className="w-3 h-3 text-muted-foreground"
          strokeWidth={2.5}
        />
      ) : null}
    </Pressable>
  );
}
