import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { ClientEnvList } from "@/components/client-env-list";
import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isSignedIn) {
    return <Redirect href="/" />;
  }

  return (
    <View
      className="flex-1 bg-background px-6"
      style={{
        paddingTop: Math.max(insets.top, 60),
        paddingBottom: Math.max(insets.bottom, 20),
      }}
    >
      <View className="mb-6 mt-8 flex-1">
        <Text className="mb-1 text-2xl font-bold text-foreground">
          Client environment
        </Text>
        <Text className="mb-4 text-sm text-muted-foreground">
          EAS production env baked into this build at compile time
        </Text>
        <ClientEnvList />
      </View>

      <View className="mb-8 w-full">
        <GoogleSignInButton />
      </View>
    </View>
  );
}
