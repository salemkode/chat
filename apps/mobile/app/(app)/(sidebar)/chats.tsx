import { ChatSidebarContent } from '../../../src/components/app/ChatSidebarContent'
import { ChatsHomeContent } from '../../../src/components/app/ChatsHomeContent'
import { SidebarShell } from '../../../src/components/app/SidebarShell'

export default function ChatsTabScreen() {
  return (
    <SidebarShell
      renderSidebar={({ closeSidebar }) => (
        <ChatSidebarContent activeThreadId={null} closeSidebar={closeSidebar} />
      )}
      renderContent={({ openSidebar }) => <ChatsHomeContent onMenuPress={openSidebar} />}
    />
  )
}
