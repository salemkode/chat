import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCallback } from "react";
import type { LocalAttachment } from "@/components/chat/attachment-types";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Upload failed";
}

function parseUploadResponse(value: unknown): { storageId: Id<"_storage"> } {
  if (
    typeof value !== "object" ||
    value === null ||
    !("storageId" in value) ||
    typeof value.storageId !== "string"
  ) {
    throw new Error("Upload response is missing storageId");
  }

  return { storageId: value.storageId as Id<"_storage"> };
}

function buildAttachmentSummary(attachments: LocalAttachment[]) {
  if (attachments.length === 0) {
    return undefined;
  }

  let imageCount = 0;
  let fileCount = 0;

  for (const attachment of attachments) {
    if (attachment.mediaType.startsWith("image/")) {
      imageCount += 1;
    } else {
      fileCount += 1;
    }
  }

  return {
    imageCount,
    fileCount,
    totalCount: imageCount + fileCount,
  };
}

export function useSendMessage() {
  const createThread = useMutation(api.agents.createChatThread);
  const generateAttachmentUploadUrl = useMutation(api.agents.generateAttachmentUploadUrl);
  const sendMessage = useMutation(api.agents.generateMessage);
  const regenerateMessage = useMutation(api.agents.regenerateMessage);
  const stopGeneration = useMutation(api.agents.stopGeneration);
  const selectAutoModel = useAction(api.modelRouter.selectAutoModel);
  const selectAutoModelForPromptMessage = useAction(
    api.modelRouter.selectAutoModelForPromptMessage,
  );

  const uploadAttachments = useCallback(
    async (attachments: LocalAttachment[]) => {
      return await Promise.all(
        attachments.map(async (attachment) => {
          const uploadUrl = await generateAttachmentUploadUrl({});
          if (!uploadUrl) {
            throw new Error("Unable to create an attachment upload URL");
          }

          const sourceResponse = await fetch(attachment.uri);
          const blob = await sourceResponse.blob();
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: {
              "Content-Type": attachment.mediaType,
            },
            body: blob,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${attachment.filename}`);
          }

          const payload = parseUploadResponse(await response.json());
          return {
            storageId: payload.storageId,
            filename: attachment.filename,
            mediaType: attachment.mediaType,
          };
        }),
      );
    },
    [generateAttachmentUploadUrl],
  );

  const send = useCallback(
    async ({
      text,
      threadId,
      modelDocId,
      searchEnabled,
      reasoning,
      attachments,
    }: {
      text: string;
      threadId?: string;
      modelDocId?: Id<"models">;
      searchEnabled?: boolean;
      reasoning?: { enabled: boolean; level?: "low" | "medium" | "high" };
      attachments?: LocalAttachment[];
    }) => {
      const prompt = text.trim();
      const resolvedAttachments = attachments ?? [];
      const attachmentSummary = buildAttachmentSummary(resolvedAttachments);

      let resolvedThreadId = threadId;

      if (!resolvedThreadId) {
        const title =
          prompt.substring(0, 30) ||
          resolvedAttachments[0]?.filename ||
          "New chat";
        resolvedThreadId = await createThread({ title });
      }

      if (!resolvedThreadId) {
        throw new Error("Failed to create thread");
      }

      let resolvedModelDocId = modelDocId;
      if (!resolvedModelDocId) {
        const routed = await selectAutoModel({
          prompt:
            prompt ||
            resolvedAttachments.map((attachment) => attachment.filename).join(", ") ||
            "Attachment",
          threadId: resolvedThreadId,
          searchEnabled: searchEnabled ?? false,
          reasoningEnabled: reasoning?.enabled === true,
          requiresImageInput: (attachmentSummary?.imageCount ?? 0) > 0,
          attachmentSummary,
        });
        resolvedModelDocId = routed.selectedModelDocId;
      }

      if (!resolvedModelDocId) {
        throw new Error("No model selected");
      }

      const uploadedAttachments =
        resolvedAttachments.length > 0
          ? await uploadAttachments(resolvedAttachments)
          : undefined;

      await sendMessage({
        threadId: resolvedThreadId,
        prompt,
        modelId: resolvedModelDocId,
        searchEnabled: searchEnabled ?? false,
        reasoning,
        attachments: uploadedAttachments,
      });

      return { threadId: resolvedThreadId };
    },
    [createThread, selectAutoModel, sendMessage, uploadAttachments],
  );

  const stop = useCallback(
    async ({ threadId }: { threadId: string }) => {
      await stopGeneration({ threadId });
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
        const routed = await selectAutoModelForPromptMessage({
          threadId,
          promptMessageId,
          searchEnabled: searchEnabled ?? false,
          reasoningEnabled: reasoning?.enabled === true,
        });
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
      });
    },
    [regenerateMessage, selectAutoModelForPromptMessage],
  );

  return { send, stop, regenerate };
}
