import {
  ChatHeaderMenuModals,
  ChatHeaderNewChatButton,
  ChatHeaderOverflowButton,
  useChatHeaderMenu,
} from "@/components/chat/chat-header-overflow-menu";
import { Icon } from "@/components/icon";
import { HeaderTitlePicker } from "@/components/header-title-picker";
import { Stack } from "expo-router";
import { Menu } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useDrawer } from "./drawer-content";

export function MainHeader() {
  const { openDrawer } = useDrawer();
  const menu = useChatHeaderMenu();
  const useNativeToolbarMenu = process.env.EXPO_OS === "ios";

  return (
    <>
      <Stack.Screen.Title asChild>
        <HeaderTitlePicker />
      </Stack.Screen.Title>
      <Stack.Toolbar placement="left" asChild={!useNativeToolbarMenu}>
        {useNativeToolbarMenu ? (
          <>
            <Stack.Toolbar.Button icon="list.bullet" onPress={openDrawer} />
            <ChatHeaderNewChatButton
              variant="native"
              visible={menu.canNewChat}
              onPress={menu.onNewChat}
            />
          </>
        ) : (
          <View className="flex-row items-center">
            <Pressable
              onPress={openDrawer}
              accessibilityLabel="Open drawer"
              accessibilityRole="button"
              className="p-2 -ml-1 active:opacity-60"
            >
              <Icon icon={Menu} className="w-6 h-6 text-foreground" />
            </Pressable>
            <ChatHeaderNewChatButton
              variant="fallback"
              visible={menu.canNewChat}
              onPress={menu.onNewChat}
            />
          </View>
        )}
      </Stack.Toolbar>
      <Stack.Toolbar placement="right" asChild={!useNativeToolbarMenu}>
        {useNativeToolbarMenu ? (
          <ChatHeaderOverflowButton
            variant="native"
            canRename={menu.canRename}
            canShare={menu.canShare}
            onRename={menu.onRename}
            onShare={menu.onShare}
          />
        ) : (
          <ChatHeaderOverflowButton
            variant="fallback"
            canRename={menu.canRename}
            canShare={menu.canShare}
            onRename={menu.onRename}
            onShare={menu.onShare}
          />
        )}
      </Stack.Toolbar>
      <ChatHeaderMenuModals {...menu} />
    </>
  );
}
