import { useViewer } from "@/hooks/use-viewer";
import { useSettings } from "@/hooks/use-settings";
import { useState, useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

export default function ProfileScreen() {
  const viewer = useViewer();
  const { settings, updateSettings } = useSettings();
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (viewer) {
      setFullName(viewer.name || "");
    }
  }, [viewer]);

  useEffect(() => {
    if (settings) {
      setBio(settings.bio || "");
    }
  }, [settings]);

  if (!viewer) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateSettings({ displayName: fullName });
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await updateSettings({ bio });
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background text-foreground"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10"
      keyboardDismissMode="interactive"
    >
      {/* Full Name */}
      <Text className="text-[13px] font-medium text-muted-foreground mt-6 mb-2">
        Full Name
      </Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        className="bg-muted rounded-xl px-4 py-3 text-[17px] text-foreground"
        style={{ borderCurve: "continuous" }}
        placeholderTextColor="#999"
      />

      {/* Update Profile Button */}
      <Pressable
        className="bg-foreground rounded-xl mt-6 py-3.5 items-center active:opacity-80"
        style={{ borderCurve: "continuous" }}
        onPress={handleSaveProfile}
        disabled={saving}
      >
        <Text className="text-[17px] font-semibold text-background">
          {saving ? "Saving..." : "Update Profile"}
        </Text>
      </Pressable>

      {/* Divider */}
      <View className="h-px bg-border my-6" />

      {/* Personal Preferences */}
      <Text className="text-[15px] font-medium text-muted-foreground mb-2">
        Personal Preferences
      </Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        multiline
        className="bg-muted rounded-xl px-4 py-3 text-[15px] text-foreground leading-relaxed min-h-[140px]"
        style={{ borderCurve: "continuous", textAlignVertical: "top" }}
        placeholderTextColor="#999"
      />
      <Text className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
        Your preferences will apply to all conversations.
      </Text>

      {/* Save Preferences Button */}
      <Pressable
        className="bg-muted rounded-xl mt-4 py-3.5 items-center active:opacity-80"
        style={{ borderCurve: "continuous" }}
        onPress={handleSavePreferences}
        disabled={saving}
      >
        <Text className="text-[17px] font-semibold text-muted-foreground">
          {saving ? "Saving..." : "Save Preferences"}
        </Text>
      </Pressable>

      {/* Divider */}
      <View className="h-px bg-border my-6" />

      {/* Delete Account */}
      <Pressable className="flex-row items-center gap-2 active:opacity-60">
        <Text className="text-[17px] text-red-500">Delete account</Text>
      </Pressable>
    </ScrollView>
  );
}
