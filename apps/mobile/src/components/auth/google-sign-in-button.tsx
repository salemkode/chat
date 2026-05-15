import { useSignInWithGoogle } from "@clerk/expo/google";
import { useSSO } from "@clerk/expo";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { Alert, Platform, Pressable, Text } from "react-native";

WebBrowser.maybeCompleteAuthSession();

type AuthErrorLike = {
  code?: string;
  message?: string;
};

function getAuthErrorDetails(err: unknown): AuthErrorLike {
  if (typeof err !== "object" || err === null) {
    return {};
  }

  const code = "code" in err && typeof err.code === "string" ? err.code : undefined;
  const message =
    "message" in err && typeof err.message === "string" ? err.message : undefined;

  return { code, message };
}

export function GoogleSignInButton() {
  const router = useRouter();
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const { startSSOFlow } = useSSO();

  const handleGoogleSignIn = async () => {
    try {
      const result =
        Platform.OS === "ios" || Platform.OS === "android"
          ? await startGoogleAuthenticationFlow()
          : await startSSOFlow({
              strategy: "oauth_google",
              redirectUrl: Linking.createURL("/sign-in"),
            });

      const { createdSessionId, setActive } = result;

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/");
      }
    } catch (err: unknown) {
      const authError = getAuthErrorDetails(err);
      if (authError.code === "SIGN_IN_CANCELLED" || authError.code === "-5") {
        return;
      }

      console.error("Google sign-in failed:", err);
      Alert.alert(
        "Google Sign-In Failed",
        authError.message || "Unable to continue with Google.",
      );
    }
  };

  return (
    <Pressable
      onPress={() => void handleGoogleSignIn()}
      className="mb-3 flex-row items-center justify-center rounded-full border border-border bg-card py-4 active:opacity-70"
    >
      <Text className="text-base font-semibold text-foreground">
        Continue with Google
      </Text>
    </Pressable>
  );
}
