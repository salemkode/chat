import { useSignIn } from "@clerk/expo";
import { Pressable, Text } from "react-native";

export function DemoLoginButton() {
  const { signIn } = useSignIn();

  const handleDemoLogin = async () => {
    try {
      const result = await signIn.create({
        identifier: "salemkode@gmail.com",
        password: "SUPER_SECRET_PASSWORD",
      });
      console.log("Demo login successful:", result);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Pressable
      onPress={handleDemoLogin}
      className="mb-3 flex-row items-center justify-center rounded-full border border-border bg-card py-4 active:opacity-70"
    >
      <Text className="text-base font-semibold text-foreground">
        Sign In Demo Account
      </Text>
    </Pressable>
  );
}