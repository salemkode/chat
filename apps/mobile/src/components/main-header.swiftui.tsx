import {
  ChatHeaderMenuModals,
  ChatHeaderNewChatButton,
  ChatHeaderOverflowButton,
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
        <ChatHeaderNewChatButton
          variant="native"
          visible={menu.canNewChat}
          onPress={menu.onNewChat}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <ChatHeaderOverflowButton
          variant="native"
          canRename={menu.canRename}
          canShare={menu.canShare}
          onRename={menu.onRename}
          onShare={menu.onShare}
        />
      </Stack.Toolbar>
      <ChatHeaderMenuModals {...menu} />
    </>
  );
}
