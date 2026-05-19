import { useViewer } from "@/hooks/use-viewer";
import { useSettings } from "@/hooks/use-settings";
import { pickOneImage } from "@/lib/image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ProfileScreen() {
  const viewer = useViewer();
  const { settings, updateSettings } = useSettings();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (viewer) {
      setDisplayName(viewer.name || "");
      setImageUri(viewer.image || null);
    }
  }, [viewer]);

  useEffect(() => {
    if (settings) {
      setBio(settings.bio || "");
      if (settings.image) {
        setImageUri(settings.image);
      }
    }
  }, [settings]);

  if (!viewer) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const initials = (displayName || viewer.name || "U")
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handlePickImage = async () => {
    const image = await pickOneImage();
    if (image) {
      setImageUri(image.uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        image: imageUri || undefined,
      });
    } catch (err) {
      console.error("Failed to save:", err);
      Alert.alert("Error", "Could not save your account settings.");
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
      <Pressable
        onPress={() => void handlePickImage()}
        className="self-center mt-6 active:opacity-80"
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="w-20 h-20 rounded-full bg-muted"
          />
        ) : (
          <View className="w-20 h-20 rounded-full bg-foreground items-center justify-center">
            <Text className="text-xl font-semibold text-background">
              {initials}
            </Text>
          </View>
        )}
      </Pressable>
      <Text className="text-[13px] text-muted-foreground text-center mt-2">
        Tap to upload a new photo
      </Text>

      <Text className="text-[13px] font-medium text-muted-foreground mt-8 mb-2">
        Display name
      </Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        className="bg-muted rounded-xl px-4 py-3 text-[17px] text-foreground"
        style={{ borderCurve: "continuous" }}
        placeholderTextColor="#999"
      />

      <Text className="text-[13px] font-medium text-muted-foreground mt-6 mb-2">
        Email
      </Text>
      <TextInput
        value={viewer.email ?? ""}
        editable={false}
        className="bg-muted rounded-xl px-4 py-3 text-[17px] text-muted-foreground"
        style={{ borderCurve: "continuous" }}
      />

      <Text className="text-[13px] font-medium text-muted-foreground mt-6 mb-2">
        Bio
      </Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        multiline
        className="bg-muted rounded-xl px-4 py-3 text-[15px] text-foreground leading-relaxed min-h-[120px]"
        style={{ borderCurve: "continuous", textAlignVertical: "top" }}
        placeholderTextColor="#999"
      />

      <Pressable
        className="bg-foreground rounded-xl mt-8 py-3.5 items-center active:opacity-80"
        style={{ borderCurve: "continuous" }}
        onPress={() => void handleSave()}
        disabled={saving}
      >
        <Text className="text-[17px] font-semibold text-background">
          {saving ? "Saving…" : "Save changes"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
