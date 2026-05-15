import { useAuth, useSignIn } from "@clerk/clerk-expo";
import { ActivityIndicator, View, Text, Pressable } from "react-native";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn: clerkSignIn, isLoaded: signInLoaded } = useSignIn();

  const handleSignIn = async () => {
    if (!clerkSignIn || !signInLoaded) return;
    try {
      const strategy = "oauth_google";
      await clerkSignIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/",
        redirectUrlComplete: "/",
      });
    } catch (err) {
      console.error("Sign in error:", err);
    }
  };

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isSignedIn) {
    return (
      <View className="flex-1 items-center justify-center bg-background gap-6 px-8">
        <Text className="text-[28px] font-bold text-foreground">Chat</Text>
        <Text className="text-[15px] text-muted-foreground text-center">
          Sign in to continue
        </Text>
        <Pressable
          className="bg-foreground rounded-xl px-8 py-3.5 active:opacity-80"
          onPress={handleSignIn}
        >
          <Text className="text-[17px] font-semibold text-background">
            Sign in
          </Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}
