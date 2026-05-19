import type { ThreadSummary } from "@chat/chat-core/types";

export type DrawerThreadRowProps = {
  thread: ThreadSummary;
  active: boolean;
  onPress: () => void;
  onPin: () => void;
  onRemoveFromProject?: () => void;
  onDelete: () => void;
};
