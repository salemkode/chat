import { DemoLoginButton } from "@/components/auth/dev-email-sign-in-button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SafeAreaView } from "@/components/tw";
import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });

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
    <SafeAreaView
      className="flex-1 justify-between bg-background px-6"
      edges={["bottom"]}
      style={{ paddingTop: Math.max(insets.top, 60) }}
    >
      <View className="mt-8">
        <Text className="text-3xl font-bold text-foreground">Welcome back</Text>
        <Text className="mt-3 text-base leading-6 text-muted-foreground">
          Sign in to continue to Chat.
        </Text>
      </View>

      <View className="w-full gap-4 pb-5">
        <GoogleSignInButton />
        {__DEV__ ? <DemoLoginButton /> : null}
      </View>
    </SafeAreaView>
  );
}
