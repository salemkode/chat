import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCallback } from "react";
import type { LocalAttachment } from "@/components/chat/attachment-types";
import { applyOptimisticGenerateMessage } from "@/hooks/chat-data/optimistic-list-messages";
import { applyOptimisticStopGeneration } from "@/hooks/chat-data/optimistic-stop-generation";
import { uploadLocalAttachment } from "@/lib/attachment-upload";
import { CHAT_STREAM_RESUME_EVENT, dispatchChatEvent } from "@/lib/chat-events";

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

async function resolveUploadedAttachments(
  attachments: LocalAttachment[],
  generateAttachmentUploadUrl: () => Promise<string | null>,
) {
  return await Promise.all(
    attachments.map(async (attachment) => {
      if (attachment.storageId && attachment.uploadStatus === "ready") {
        return {
          storageId: attachment.storageId,
          filename: attachment.filename,
          mediaType: attachment.mediaType,
        };
      }

      return await uploadLocalAttachment(attachment, generateAttachmentUploadUrl);
    }),
  );
}

export function useSendMessage() {
  const createThread = useMutation(api.agents.createChatThread);
  const generateAttachmentUploadUrl = useMutation(
    api.agents.generateAttachmentUploadUrl,
  );
  const sendMessage = useMutation(api.agents.generateMessage).withOptimisticUpdate(
    (localStore, args) => {
      applyOptimisticGenerateMessage(
        localStore,
        args.threadId,
        args.prompt,
        args.attachments?.map((attachment) => ({
          filename: attachment.filename,
          mediaType: attachment.mediaType,
        })),
      );
    },
  );
  const regenerateMessage = useMutation(api.agents.regenerateMessage);
  const stopGeneration = useMutation(api.agents.stopGeneration).withOptimisticUpdate(
    (localStore, args) => {
      applyOptimisticStopGeneration(localStore, args.threadId);
    },
  );
  const selectAutoModel = useAction(api.modelRouter.selectAutoModel);
  const selectAutoModelForPromptMessage = useAction(
    api.modelRouter.selectAutoModelForPromptMessage,
  );

  const getUploadUrl = useCallback(async () => {
    const uploadUrl = await generateAttachmentUploadUrl({});
    return uploadUrl ?? null;
  }, [generateAttachmentUploadUrl]);

  const send = useCallback(
    async ({
      text,
      threadId,
      modelDocId,
      searchEnabled,
      searchMode,
      reasoning,
      attachments,
    }: {
      text: string;
      threadId?: string;
      modelDocId?: Id<"models">;
      searchEnabled?: boolean;
      searchMode?: "auto" | "required";
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
          ? await resolveUploadedAttachments(resolvedAttachments, getUploadUrl)
          : undefined;

      const resolvedSearchMode =
        searchEnabled === true ? (searchMode ?? "required") : undefined;

      await sendMessage({
        threadId: resolvedThreadId,
        prompt,
        modelId: resolvedModelDocId,
        searchEnabled: searchEnabled ?? false,
        ...(resolvedSearchMode ? { searchMode: resolvedSearchMode } : {}),
        reasoning,
        attachments: uploadedAttachments,
      });

      return { threadId: resolvedThreadId };
    },
    [createThread, getUploadUrl, selectAutoModel, sendMessage],
  );

  const stop = useCallback(
    async ({
      threadId,
      promptMessageId,
    }: {
      threadId: string
      promptMessageId?: string
    }) => {
      const result = (await stopGeneration({
        threadId,
        ...(promptMessageId ? { promptMessageId } : {}),
      })) as { stopped?: boolean; impl?: number } | null;
      dispatchChatEvent(CHAT_STREAM_RESUME_EVENT, { threadId });
      if (result && "impl" in result && result.impl !== 2) {
        throw new Error(
          "Stop is not available on this server build. Redeploy Convex backend (agents.stopGeneration impl v2).",
        );
      }
      return { stopped: Boolean(result?.stopped) };
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
