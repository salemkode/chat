import {
  DRAWER_THREAD_ROW_HEIGHT,
  DrawerThreadRowSlot,
} from "@/components/drawer/drawer-thread-row-layout";
import { DrawerThreadRowTrigger } from "@/components/drawer/drawer-thread-row-trigger";
import type { DrawerThreadRowProps } from "@/components/drawer/drawer-thread-row-types";
import {
  Button,
  ContextMenu,
  Host,
  RNHostView,
} from "@expo/ui/swift-ui";
import { View } from "react-native";

function DrawerThreadRowNativeMenu({
  props,
  rowWidth,
}: {
  props: DrawerThreadRowProps;
  rowWidth: number;
}) {
  const { thread, onPress, onPin, onRemoveFromProject, onDelete } = props;
  const slotStyle = { width: rowWidth, height: DRAWER_THREAD_ROW_HEIGHT };

  return (
    <Host style={slotStyle}>
      <ContextMenu>
        <ContextMenu.Items>
          <Button
            label={thread.pinned ? "Unpin" : "Pin"}
            systemImage="pin"
            onPress={onPin}
          />
          {onRemoveFromProject ? (
            <Button
              label="Remove from project"
              systemImage="folder.badge.minus"
              onPress={onRemoveFromProject}
            />
          ) : null}
          <Button
            label="Delete"
            systemImage="trash"
            role="destructive"
            onPress={onDelete}
          />
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <RNHostView matchContents>
            <View style={slotStyle}>
              <DrawerThreadRowTrigger
                thread={props.thread}
                active={props.active}
                onPress={onPress}
              />
            </View>
          </RNHostView>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
}

export function DrawerThreadRow(props: DrawerThreadRowProps) {
  return (
    <DrawerThreadRowSlot>
      {({ width }) => <DrawerThreadRowNativeMenu props={props} rowWidth={width} />}
    </DrawerThreadRowSlot>
  );
}
