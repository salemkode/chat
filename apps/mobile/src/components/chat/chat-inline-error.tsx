import { resolveChatInlineErrorMessage } from "@chat/shared/logic/user-facing-errors";
import { cn } from "@/utils/tailwind";
import { Text, View } from "react-native";

/** Flat inline error banner — no border, shadow, or elevation. */
const FLAT_ERROR_SURFACE_STYLE = {
  borderCurve: "continuous" as const,
  shadowColor: "transparent",
  shadowOpacity: 0,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 0 },
  elevation: 0,
};

export function ChatInlineError({
  message,
  variant = "message",
  className,
}: {
  message: string;
  variant?: "composer" | "message";
  className?: string;
}) {
  return (
    <View
      className={cn(
        "flex-row gap-2 px-3 py-2.5",
        variant === "composer" ? "items-center" : "items-start",
        className,
      )}
      style={FLAT_ERROR_SURFACE_STYLE}
    >
      <View
        className={cn(
          "h-2 w-2 rounded-full",
          variant === "message" && "mt-1.5",
        )}
        style={{ backgroundColor: "#EF4444" }}
      />
      <Text
        className={cn(
          "flex-1 text-muted-foreground",
          variant === "composer" ? "text-xs leading-4" : "text-sm leading-5",
        )}
        numberOfLines={variant === "composer" ? 2 : undefined}
      >
        {resolveChatInlineErrorMessage(message)}
      </Text>
    </View>
  );
}
