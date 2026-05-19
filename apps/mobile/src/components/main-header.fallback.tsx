import {
  ChatHeaderMenuModals,
  ChatHeaderNewChatButton,
  ChatHeaderOverflowButton,
  useChatHeaderMenu,
} from "@/components/chat/chat-header-overflow-menu";
import { Icon } from "@/components/icon";
import { useModel } from "@/components/model-context";
import { useChatHeaderLabels } from "@/hooks/use-chat-header";
import { Link, Stack } from "expo-router";
import { ChevronDown, Menu } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useDrawer } from "./drawer-content";

function HeaderTitleMenu() {
  const { selectedModel } = useModel();
  const { threadTitle } = useChatHeaderLabels();

  return (
    <Link href="/model-picker" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select model"
        className="px-2 py-1 rounded-md active:bg-muted flex-col items-center self-center max-w-[260px]"
      >
        <Text
          numberOfLines={1}
          className="text-[17px] font-semibold text-foreground text-center"
        >
          {threadTitle}
        </Text>
        <View className="flex-row items-center gap-1 mt-0.5">
          <Text
            numberOfLines={1}
            className="text-[12px] text-muted-foreground"
          >
            {selectedModel}
          </Text>
          <Icon icon={ChevronDown} className="w-3 h-3 text-muted-foreground" />
        </View>
      </Pressable>
    </Link>
  );
}

export function MainHeader() {
  const { openDrawer } = useDrawer();
  const menu = useChatHeaderMenu();
  const useNativeToolbarMenu = process.env.EXPO_OS === "ios";

  return (
    <>
      <Stack.Screen.Title asChild>
        <HeaderTitleMenu />
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
