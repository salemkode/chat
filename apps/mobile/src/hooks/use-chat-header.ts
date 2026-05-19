import { threadSelection$ } from "@/state/thread-selection";
import { useThread } from "@/hooks/use-threads";
import { useSelector } from "@legendapp/state/react";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useCallback } from "react";
import { Alert, Platform } from "react-native";
import { useCSSVariable, useUniwind } from "uniwind";

/** Title colors that track the active Uniwind theme (light / dark / system). */
export function useChatHeaderColors() {
  const { theme } = useUniwind();
  const [foreground, mutedForeground] = useCSSVariable([
    "--app-foreground",
    "--app-muted-foreground",
  ]);

  return {
    theme,
    foreground: typeof foreground === "string" ? foreground : undefined,
    mutedForeground:
      typeof mutedForeground === "string" ? mutedForeground : undefined,
  };
}

export function useChatHeaderLabels() {
  const selectedThreadId = useSelector(() =>
    threadSelection$.selectedThreadId.get(),
  );
  const thread = useThread(selectedThreadId);

  const threadTitle = selectedThreadId
    ? thread?.title?.trim() || "Untitled"
    : "New Chat";

  return {
    threadTitle,
    threadId: selectedThreadId,
    canRename: Boolean(selectedThreadId),
    canShare: Boolean(selectedThreadId),
  };
}

export function useChatHeaderActions() {
  const { threadTitle, threadId, canRename } = useChatHeaderLabels();
  const updateThreadTitle = useMutation(api.agents.updateThreadTitle);

  const renameThread = useCallback(
    async (title: string) => {
      if (!threadId) {
        return;
      }
      await updateThreadTitle({ threadId, title });
    },
    [threadId, updateThreadTitle],
  );

  const promptRename = useCallback(() => {
    if (!threadId || !canRename) {
      return;
    }

    if (Platform.OS === "ios" && Alert.prompt) {
      Alert.prompt(
        "Rename chat",
        undefined,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: (nextTitle?: string) => {
              const trimmed = nextTitle?.trim();
              if (!trimmed) {
                return;
              }
              void renameThread(trimmed).catch(() => {
                Alert.alert("Rename failed", "Could not update the chat title.");
              });
            },
          },
        ],
        "plain-text",
        threadTitle === "Untitled" ? "" : threadTitle,
      );
      return;
    }

    return "modal" as const;
  }, [canRename, renameThread, threadId, threadTitle]);

  return {
    renameThread,
    promptRename,
    canRename,
  };
}
