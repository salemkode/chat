import {
  ChatHeaderMenuModals,
  useChatHeaderMenu,
} from "@/components/chat/chat-header-overflow-menu";
import { HeaderTitlePicker } from "@/components/header-title-picker";
import { Stack } from "expo-router";
import { useDrawer } from "./drawer-content";

export function MainHeader() {
  const { openDrawer } = useDrawer();
  const menu = useChatHeaderMenu();

  return (
    <>
      <Stack.Screen.Title asChild>
        <HeaderTitlePicker />
      </Stack.Screen.Title>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="list.bullet" onPress={openDrawer} />
        {menu.canNewChat ? (
          <Stack.Toolbar.Button
            icon="square.and.pencil"
            onPress={menu.onNewChat}
            accessibilityLabel="New chat"
          />
        ) : null}
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        {menu.canRename || menu.canShare ? (
          <Stack.Toolbar.Menu icon="ellipsis">
            {menu.canRename ? (
              <Stack.Toolbar.MenuAction icon="pencil" onPress={menu.onRename}>
                <Stack.Toolbar.Label>Rename</Stack.Toolbar.Label>
              </Stack.Toolbar.MenuAction>
            ) : null}
            {menu.canShare ? (
              <Stack.Toolbar.MenuAction
                icon="square.and.arrow.up"
                onPress={menu.onShare}
              >
                <Stack.Toolbar.Label>Share</Stack.Toolbar.Label>
              </Stack.Toolbar.MenuAction>
            ) : null}
          </Stack.Toolbar.Menu>
        ) : null}
      </Stack.Toolbar>
      <ChatHeaderMenuModals {...menu} />
    </>
  );
}
