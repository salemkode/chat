import { DrawerThreadRowSimpleLayout } from "@/components/drawer/drawer-thread-row-layout";
import { DrawerThreadRowTrigger } from "@/components/drawer/drawer-thread-row-trigger";
import type { DrawerThreadRowProps } from "@/components/drawer/drawer-thread-row-types";
import { Alert } from "react-native";

function showThreadContextMenu({
  thread,
  onPin,
  onRemoveFromProject,
  onDelete,
}: DrawerThreadRowProps) {
  Alert.alert(
    thread.title || "Untitled",
    undefined,
    [
      {
        text: thread.pinned ? "Unpin" : "Pin",
        onPress: onPin,
      },
      ...(onRemoveFromProject
        ? [
            {
              text: "Remove from project",
              onPress: onRemoveFromProject,
            },
          ]
        : []),
      {
        text: "Delete",
        style: "destructive" as const,
        onPress: onDelete,
      },
      { text: "Cancel", style: "cancel" as const },
    ],
    { cancelable: true },
  );
}

export function DrawerThreadRowFallback(props: DrawerThreadRowProps) {
  return (
    <DrawerThreadRowSimpleLayout nested={props.nested}>
      <DrawerThreadRowTrigger
        thread={props.thread}
        active={props.active}
        nested={props.nested}
        onPress={props.onPress}
        onLongPress={() => showThreadContextMenu(props)}
      />
    </DrawerThreadRowSimpleLayout>
  );
}
