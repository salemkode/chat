import { AndroidGrabber } from "@/components/grabber";
import { Icon } from "@/components/icon";
import type { ProjectSummary } from "@chat/chat-core/types";
import { Check } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ProjectPickerContentProps = {
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
};

function ProjectRow({
  label,
  subtitle,
  selected,
  onPress,
}: {
  label: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-5 py-3 active:bg-muted"
    >
      <View className="w-5 items-center">
        {selected ? (
          <Icon icon={Check} className="h-5 w-5 text-foreground" />
        ) : null}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[17px] text-foreground" numberOfLines={1}>
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ProjectPickerContent({
  projects,
  selectedProjectId,
  onSelectProject,
}: ProjectPickerContentProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: process.env.EXPO_OS === "android" ? insets.bottom : undefined,
      }}
    >
      <AndroidGrabber />

      <ProjectRow
        label="None"
        selected={selectedProjectId === null}
        onPress={() => onSelectProject(null)}
      />

      {projects.length === 0 ? (
        <View className="px-5 py-4">
          <Text className="text-[15px] text-muted-foreground">
            Create a project from the sidebar to organize chats.
          </Text>
        </View>
      ) : (
        projects.map((project) => (
          <ProjectRow
            key={project.id}
            label={project.name}
            subtitle={project.description}
            selected={selectedProjectId === project.id}
            onPress={() => onSelectProject(project.id)}
          />
        ))
      )}
    </ScrollView>
  );
}
