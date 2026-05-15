import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
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
      <View className="mb-10 mt-12 flex-1 justify-center">
        <Text className="mb-3 text-4xl font-bold text-foreground">
          Welcome back
        </Text>
        <Text className="text-lg text-muted-foreground">
          Sign in to continue
        </Text>
      </View>

      <View className="mb-8 w-full">
        <GoogleSignInButton />
      </View>
    </View>
  );
}
