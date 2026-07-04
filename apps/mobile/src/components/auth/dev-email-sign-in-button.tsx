import { api } from "@convex/_generated/api";
import { useSignIn } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text } from "react-native";
import { publicConvex } from "@/lib/convex";

const DEMO_EMAIL = "salemkode@gmail.com";
const DEMO_SIGN_IN_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(message));
    }, DEMO_SIGN_IN_TIMEOUT_MS);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error !== "object" || error === null) {
    return "Unable to sign in with demo account.";
  }

  if (
    "errors" in error &&
    Array.isArray(error.errors) &&
    error.errors.length > 0
  ) {
    const [firstError] = error.errors;
    if (
      typeof firstError === "object" &&
      firstError !== null &&
      "longMessage" in firstError &&
      typeof firstError.longMessage === "string"
    ) {
      return firstError.longMessage;
    }
    if (
      typeof firstError === "object" &&
      firstError !== null &&
      "message" in firstError &&
      typeof firstError.message === "string"
    ) {
      return firstError.message;
    }
  }

  return "Unable to sign in with demo account.";
}

export function DemoLoginButton() {
  const { signIn } = useSignIn();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = async () => {
    if (!signIn || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const { ticket } = await withTimeout(
        publicConvex.action(api.devAuth.createMobileDevSignInTicket, {
          email: DEMO_EMAIL,
        }),
        "Demo sign-in timed out while requesting a Clerk ticket.",
      );
      const result = await signIn.ticket({
        ticket,
      });

      if (result.error) {
        throw result.error;
      }

      if (signIn.status !== "complete" || !signIn.createdSessionId) {
        Alert.alert(
          "Demo Sign-In Failed",
          `Sign-in did not complete. Status: ${signIn.status ?? "unknown"}`,
        );
        return;
      }

      const finalizeResult = await signIn.finalize();
      if (finalizeResult.error) {
        throw finalizeResult.error;
      }

      router.replace("/");
    } catch (err) {
      const message = getErrorMessage(err);
      console.error("Demo sign-in failed", message, err);
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
