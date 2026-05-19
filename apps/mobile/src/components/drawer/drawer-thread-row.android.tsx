import {
  DRAWER_THREAD_ROW_HEIGHT,
  DrawerThreadRowSlot,
} from "@/components/drawer/drawer-thread-row-layout";
import { DrawerThreadRowTrigger } from "@/components/drawer/drawer-thread-row-trigger";
import type { DrawerThreadRowProps } from "@/components/drawer/drawer-thread-row-types";
import {
  DropdownMenu,
  DropdownMenuItem,
  Host,
  RNHostView,
} from "@expo/ui/jetpack-compose";
import { useCallback, useState } from "react";
import { View } from "react-native";

function DrawerThreadRowNativeMenu({
  props,
  rowWidth,
}: {
  props: DrawerThreadRowProps;
  rowWidth: number;
}) {
  const { thread, onPress, onPin, onRemoveFromProject, onDelete } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const slotStyle = { width: rowWidth, height: DRAWER_THREAD_ROW_HEIGHT };

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const runAction = useCallback(
    (action: () => void) => {
      closeMenu();
      action();
    },
    [closeMenu],
  );

  return (
    <Host style={slotStyle}>
      <DropdownMenu
        expanded={menuOpen}
        onDismissRequest={closeMenu}
        style={slotStyle}
      >
        <DropdownMenu.Trigger>
          <RNHostView matchContents>
            <View style={slotStyle}>
              <DrawerThreadRowTrigger
                thread={props.thread}
                active={props.active}
                onPress={onPress}
                onLongPress={() => setMenuOpen(true)}
              />
            </View>
          </RNHostView>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          <DropdownMenuItem onClick={() => runAction(onPin)}>
            <DropdownMenuItem.Text>
              {thread.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
          {onRemoveFromProject ? (
            <DropdownMenuItem onClick={() => runAction(onRemoveFromProject)}>
              <DropdownMenuItem.Text>Remove from project</DropdownMenuItem.Text>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => runAction(onDelete)}>
            <DropdownMenuItem.Text>Delete</DropdownMenuItem.Text>
          </DropdownMenuItem>
        </DropdownMenu.Items>
      </DropdownMenu>
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
