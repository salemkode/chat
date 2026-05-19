import {
  ChatHeaderMenuModals,
  ChatHeaderOverflowButton,
  useChatHeaderMenu,
} from "@/components/chat/chat-header-overflow-menu";
import { useModel } from "@/components/model-context";
import { useChatHeaderColors, useChatHeaderLabels } from "@/hooks/use-chat-header";
import {
  Button,
  Host,
  HStack,
  Menu,
  Section,
  Image as SUIImage,
  Text as SUIText,
  VStack,
} from "@expo/ui/swift-ui";
import {
  controlSize,
  font,
  foregroundStyle,
} from "@expo/ui/swift-ui/modifiers";
import { Stack } from "expo-router";
import { useDrawer } from "./drawer-content";

function HeaderTitleMenu() {
  const { models, selectedModelId, setSelectedModel } = useModel();
  const { threadTitle } = useChatHeaderLabels();
  const { foreground, mutedForeground } = useChatHeaderColors();
  const headerFg = foreground ?? "#000";
  const headerFgMuted = mutedForeground ?? "rgba(0,0,0,0.5)";

  const selected = models.find((m) => m.id === selectedModelId);

  return (
    <Host
      style={{
        minWidth: 120,
        minHeight: 40,
        maxWidth: 280,
      }}
    >
      <Menu
        label={
          <VStack spacing={0} alignment="center">
            <SUIText
              modifiers={[
                foregroundStyle(headerFg),
                font({ weight: "semibold", size: 17 }),
              ]}
            >
              {threadTitle}
            </SUIText>
            <HStack spacing={4} alignment="center">
              <SUIText
                modifiers={[foregroundStyle(headerFgMuted), font({ size: 12 })]}
              >
                {selected?.label ?? "Model"}
              </SUIText>
              <SUIImage systemName="chevron.down" size={10} color={headerFgMuted} />
            </HStack>
          </VStack>
        }
        modifiers={[controlSize("regular")]}
      >
        <Section title="Select Model">
          {models.map((model) => (
            <Button
              key={model.id}
              systemImage={model.id === selectedModelId ? "checkmark" : "circle"}
              label={model.label}
              onPress={() => setSelectedModel(model.id)}
            />
          ))}
        </Section>
      </Menu>
    </Host>
  );
}

export function MainHeader() {
  const { openDrawer } = useDrawer();
  const menu = useChatHeaderMenu();

  return (
    <>
      <Stack.Screen.Title asChild>
        <HeaderTitleMenu />
      </Stack.Screen.Title>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="list.bullet" onPress={openDrawer} />
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
