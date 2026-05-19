import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

type RenameChatModalProps = {
  visible: boolean;
  initialTitle: string;
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
};

export function RenameChatModal({
  visible,
  initialTitle,
  onClose,
  onSave,
}: RenameChatModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
    }
  }, [initialTitle, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/40 justify-center px-6"
        onPress={onClose}
      >
        <Pressable
          className="rounded-2xl bg-card border border-border p-4 gap-4"
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-lg font-semibold text-foreground">Rename chat</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            autoFocus
            maxLength={60}
            placeholder="Chat title"
            placeholderTextColor="#888"
            className="rounded-xl border border-border px-3 py-2.5 text-foreground"
          />
          <View className="flex-row justify-end gap-2">
            <Pressable
              onPress={onClose}
              className="px-4 py-2 rounded-lg active:bg-muted"
            >
              <Text className="text-foreground">Cancel</Text>
            </Pressable>
            <Pressable
              disabled={saving || !title.trim()}
              onPress={() => {
                const trimmed = title.trim();
                if (!trimmed) {
                  return;
                }
                setSaving(true);
                void onSave(trimmed)
                  .then(onClose)
                  .finally(() => setSaving(false));
              }}
              className="px-4 py-2 rounded-lg bg-foreground active:opacity-80 disabled:opacity-40"
            >
              <Text className="text-background font-medium">Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
