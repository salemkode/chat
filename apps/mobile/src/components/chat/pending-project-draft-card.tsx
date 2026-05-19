import type { PendingProjectDraft } from "@chat/shared/logic/project-mention";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { ComposerFloatingInsetSurface } from "./composer-floating-surface";

export function PendingProjectDraftCard({
  draft,
  name,
  description,
  creatingProject,
  onNameChange,
  onDescriptionChange,
  onConfirm,
  onCancel,
}: {
  draft: PendingProjectDraft;
  name: string;
  description: string;
  creatingProject: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const disabled = draft.loading || creatingProject;

  return (
    <ComposerFloatingInsetSurface className="w-full px-3 py-3">
      <Text className="mb-2 text-sm font-semibold text-foreground">
        New project for this chat
      </Text>
      {draft.loading ? (
        <View className="mb-2 flex-row items-center gap-2">
          <ActivityIndicator
            size="small"
            colorClassName="tint-muted-foreground"
          />
          <Text className="text-xs text-muted-foreground">
            Generating project suggestion...
          </Text>
        </View>
      ) : null}
      {draft.error ? (
        <Text className="mb-2 text-xs text-destructive">{draft.error}</Text>
      ) : null}
      <TextInput
        value={name}
        onChangeText={onNameChange}
        placeholder="Project name"
        editable={!disabled}
        className="mb-2 rounded-[14px] border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground"
        placeholderTextColorClassName="tint-muted-foreground"
        style={{ borderCurve: "continuous" }}
      />
      <TextInput
        value={description}
        onChangeText={onDescriptionChange}
        placeholder="Project description (optional)"
        editable={!disabled}
        multiline
        className="mb-3 min-h-18 rounded-[14px] border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground"
        placeholderTextColorClassName="tint-muted-foreground"
        style={{ borderCurve: "continuous" }}
      />
      <View className="flex-row justify-end gap-2">
        <Pressable
          onPress={onCancel}
          disabled={creatingProject}
          className="rounded-full border border-border/70 px-3.5 py-2 active:bg-muted/50"
        >
          <Text className="text-xs font-medium text-muted-foreground">
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          disabled={disabled || !name.trim()}
          className="rounded-full bg-foreground px-3.5 py-2 active:opacity-90 disabled:opacity-50"
        >
          <Text className="text-xs font-medium text-background">
            {creatingProject ? "Creating…" : "Create project"}
          </Text>
        </Pressable>
      </View>
    </ComposerFloatingInsetSurface>
  );
}
