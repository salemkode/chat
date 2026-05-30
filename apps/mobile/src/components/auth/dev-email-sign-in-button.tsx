import { api } from "@convex/_generated/api";
import { useClerk, useSignIn } from "@clerk/expo";
import { useAction } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text } from "react-native";

const DEMO_EMAIL = "salemkode@gmail.com";

export function DemoLoginButton() {
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const router = useRouter();
  const createMobileDevSignInTicket = useAction(
    api.devAuth.createMobileDevSignInTicket,
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = async () => {
    if (!signIn || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const { ticket } = await createMobileDevSignInTicket({ email: DEMO_EMAIL });
      const { error } = await signIn.ticket({ ticket });

      if (error) {
        Alert.alert("Login Failed", error.message ?? "Unable to sign in.");
        return;
      }

      if (signIn.status !== "complete" || !signIn.createdSessionId) {
        Alert.alert(
          "Demo Sign-In Failed",
          `Sign-in did not complete. Status: ${signIn.status}`,
        );
        return;
      }

      await setActive({ session: signIn.createdSessionId });
      router.replace("/");
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Unable to sign in with demo account.";
      Alert.alert("Demo Sign-In Failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Pressable
      disabled={isLoading}
      onPress={() => void handleDemoLogin()}
      className="mb-3 flex-row items-center justify-center rounded-full border border-border bg-card py-4 active:opacity-70 disabled:opacity-60"
    >
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <Text className="text-base font-semibold text-foreground">
          Sign In Demo Account
        </Text>
      )}
    </Pressable>
  );
}
