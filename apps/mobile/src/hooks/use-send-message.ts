import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCallback } from "react";

export function useSendMessage() {
  const createThread = useMutation(api.agents.createChatThread);
  const generateAttachmentUploadUrl = useMutation(api.agents.generateAttachmentUploadUrl);
  const sendMessage = useMutation(api.agents.generateMessage);
  const regenerateMessage = useMutation(api.agents.regenerateMessage);
  const stopGeneration = useMutation(
    (api as any).agents.stopGeneration as never,
  );
  const selectAutoModel = useAction(
    (api as any).modelRouter.selectAutoModel as never,
  );

  const send = useCallback(
    async ({
      text,
      threadId,
      modelDocId,
      searchEnabled,
      reasoning,
    }: {
      text: string;
      threadId?: string;
      modelDocId?: Id<"models">;
      searchEnabled?: boolean;
      reasoning?: { enabled: boolean; level?: "low" | "medium" | "high" };
    }) => {
      let resolvedThreadId = threadId;

      if (!resolvedThreadId) {
        const title = text.substring(0, 30) || "New chat";
        resolvedThreadId = await createThread({ title } as never);
      }

      if (!resolvedThreadId) {
        throw new Error("Failed to create thread");
      }

      let resolvedModelDocId = modelDocId;
      if (!resolvedModelDocId) {
        const routed = (await selectAutoModel({
          prompt: text,
          threadId: resolvedThreadId,
          searchEnabled: searchEnabled ?? false,
          reasoningEnabled: reasoning?.enabled === true,
        } as never)) as { selectedModelDocId: Id<"models"> };
        resolvedModelDocId = routed.selectedModelDocId;
      }

      if (!resolvedModelDocId) {
        throw new Error("No model selected");
      }

      await sendMessage({
        threadId: resolvedThreadId,
        prompt: text,
        modelId: resolvedModelDocId,
        searchEnabled: searchEnabled ?? false,
        reasoning,
      } as never);

      return { threadId: resolvedThreadId };
    },
    [createThread, sendMessage, selectAutoModel],
  );

  const stop = useCallback(
    async ({ threadId }: { threadId: string }) => {
      await stopGeneration({ threadId } as never);
    },
    [stopGeneration],
  );

  const regenerate = useCallback(
    async ({
      threadId,
      promptMessageId,
      modelDocId,
      searchEnabled,
      reasoning,
    }: {
      threadId: string;
      promptMessageId: string;
      modelDocId?: Id<"models">;
      searchEnabled?: boolean;
      reasoning?: { enabled: boolean; level?: "low" | "medium" | "high" };
    }) => {
      let resolvedModelDocId = modelDocId;
      if (!resolvedModelDocId) {
        const routed = (await selectAutoModel({
          threadId,
          promptMessageId,
          searchEnabled: searchEnabled ?? false,
          reasoningEnabled: reasoning?.enabled === true,
        } as never)) as { selectedModelDocId: Id<"models"> };
        resolvedModelDocId = routed.selectedModelDocId;
      }

      if (!resolvedModelDocId) {
        throw new Error("No model selected");
      }

      await regenerateMessage({
        threadId,
        promptMessageId,
        modelId: resolvedModelDocId,
        searchEnabled: searchEnabled ?? false,
        reasoning,
      } as never);
    },
    [regenerateMessage, selectAutoModel],
  );

  return { send, stop, regenerate };
}
