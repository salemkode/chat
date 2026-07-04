import {
  ChatHeaderMenuModals,
  ChatHeaderNewChatButton,
  ChatHeaderOverflowButton,
  useChatHeaderMenu,
} from '@/components/chat/chat-header-overflow-menu'
import { AppHeader, HeaderIconButton } from '@/components/app-header'
import { HeaderTitlePicker } from '@/components/header-title-picker'
import { Menu } from 'lucide-react-native'
import { View } from 'react-native'
import { useDrawer } from './drawer-content'

export function MainHeader() {
  const { openDrawer } = useDrawer()
  const menu = useChatHeaderMenu()

  return (
    <>
      <AppHeader
        testID="manual-main-header"
        center={<HeaderTitlePicker />}
        left={
          <View className="flex-row items-center">
            <HeaderIconButton icon={Menu} accessibilityLabel="Open drawer" onPress={openDrawer} />
            <ChatHeaderNewChatButton visible={menu.canNewChat} onPress={menu.onNewChat} />
          </View>
        }
        right={
          <ChatHeaderOverflowButton
            canRename={menu.canRename}
            canShare={menu.canShare}
            open={menu.overflowOpen}
            onOpenChange={menu.setOverflowOpen}
            onRename={menu.onRename}
            onShare={menu.onShare}
          />
        }
      />
      <ChatHeaderMenuModals {...menu} />
    </>
  )
}
