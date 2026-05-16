import { useModel } from "@/components/model-context";
import { threadSelection$ } from "@/state/thread-selection";
import { useSelector } from "@legendapp/state/react";
import {
  Button,
  Host,
  HStack,
  Menu,
  Section,
  Image as SUIImage,
  Text as SUIText,
  Toggle,
  VStack,
} from "@expo/ui/swift-ui";
import {
  controlSize,
  font,
  foregroundStyle,
} from "@expo/ui/swift-ui/modifiers";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { useDrawer } from "./drawer-content";

function HeaderTitleMenu() {
  const { models, selectedModel, selectedModelId, setSelectedModel, extendedThinking, setExtendedThinking } =
    useModel();
  const selectedThreadId = useSelector(() =>
    threadSelection$.selectedThreadId.get(),
  );
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const headerFg = isDark ? "#fff" : "#000";
  const headerFgMuted = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)";

  const selected = models.find((m) => m.id === selectedModelId);
  const shortThreadId = selectedThreadId
    ? selectedThreadId.slice(-6)
    : "new";
  const subtitle = extendedThinking
    ? `Extended • ${shortThreadId}`
    : shortThreadId;
  return (
    <Host
      style={{
        minWidth: 120,
        minHeight: 40,
      }}
    >
      <Menu
        label={
          <VStack spacing={0}>
            <HStack spacing={4} alignment="center">
              <SUIText
                modifiers={[
                  foregroundStyle(headerFg),
                  font({ weight: "semibold", size: 17 }),
                ]}
              >
                {selected?.label ?? "Model"}
              </SUIText>
              <SUIImage systemName="chevron.down" size={10} color={headerFg} />
            </HStack>
            {subtitle && (
              <SUIText
                modifiers={[foregroundStyle(headerFgMuted), font({ size: 12 })]}
              >
                {subtitle}
              </SUIText>
            )}
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
        <Toggle isOn={extendedThinking} onIsOnChange={setExtendedThinking}>
          <SUIText>Extended thinking</SUIText>
          <SUIText>Think longer for complex tasks</SUIText>
        </Toggle>
      </Menu>
    </Host>
  );
}

export function MainHeader() {
  const { openDrawer } = useDrawer();
  return (
    <>
      <Stack.Screen.Title asChild>
        <HeaderTitleMenu />
      </Stack.Screen.Title>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="list.bullet" onPress={openDrawer} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="eyeglasses" />
      </Stack.Toolbar>
    </>
  );
}
