import { Icon } from "@/components/icon";
import { drawerThreadRowHeight } from "@/components/drawer/drawer-thread-row-layout";
import { cn } from "@/utils/tailwind";
import type { ThreadSummary } from "@chat/chat-core/types";
import { Pin } from "lucide-react-native";
import { Pressable, Text } from "react-native";

export function DrawerThreadRowTrigger({
  thread,
  active,
  nested,
  onPress,
  onLongPress,
}: {
  thread: ThreadSummary;
  active: boolean;
  nested?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ height: drawerThreadRowHeight(nested) }}
      className={cn(
        "flex-row items-center rounded-[8px] active:bg-accent ml-4",
        nested ? "px-3 py-1.5" : "px-4 py-2.5 rounded-[10px]",
        active && "bg-accent",
      )}
    >
      <Text
        numberOfLines={1}
        className={cn("mr-1.5", nested ? "text-[13px]" : "text-[15px] mr-2")}
      >
        {thread.emoji}
      </Text>
      <Text
        numberOfLines={1}
        className={cn(
          "flex-1",
          nested ? "text-[13px]" : "text-[15px]",
          active
            ? "text-foreground font-medium"
            : nested
              ? "text-foreground/75"
              : "text-foreground/85",
        )}
      >
        {thread.title || "Untitled"}
      </Text>
      {thread.pinned ? (
        <Icon
          icon={Pin}
          className={cn(
            "text-muted-foreground",
            nested ? "w-2.5 h-2.5" : "w-3 h-3",
          )}
          strokeWidth={2.5}
        />
      ) : null}
    </Pressable>
  );
}
