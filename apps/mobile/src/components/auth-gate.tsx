import { useAuth } from "@clerk/expo";
import { useConvexAuth } from "convex/react";
import { Redirect } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn, signOut } = useAuth();
  const { isLoading: convexLoading, isAuthenticated: convexAuthenticated } =
    useConvexAuth();

  if (!clerkLoaded || convexLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  if (!convexAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-lg font-semibold text-foreground">
          Could not connect your session
        </Text>
        <Text className="mt-3 text-center text-base leading-6 text-muted-foreground">
          You are signed in with Clerk, but Convex did not accept the auth
          token. Try signing out and back in.
        </Text>
        <Pressable
          onPress={() => void signOut()}
          className="mt-6 rounded-full bg-foreground px-6 py-3 active:opacity-70"
        >
          <Text className="text-base font-semibold text-background">
            Sign out
          </Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}
