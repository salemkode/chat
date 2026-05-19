import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

import {
  attachmentFingerprint,
  type LocalAttachment,
} from "./attachment-types";
import { uploadLocalAttachment } from "@/lib/attachment-upload";

type ChatAttachmentsContextValue = {
  attachments: LocalAttachment[];
  addAttachments: (attachments: LocalAttachment[]) => void;
  removeAttachment: (attachmentId: string) => void;
  clearAttachments: () => void;
  hasUploadingAttachments: boolean;
};

const ChatAttachmentsContext =
  createContext<ChatAttachmentsContextValue | null>(null);

function mergeAttachments(
  current: LocalAttachment[],
  incoming: LocalAttachment[],
) {
  if (incoming.length === 0) {
    return current;
  }

  const seen = new Set(current.map(attachmentFingerprint));
  const next = [...current];

  for (const attachment of incoming) {
    const fingerprint = attachmentFingerprint(attachment);
    if (seen.has(fingerprint)) {
      continue;
    }
    seen.add(fingerprint);
    next.push({
      ...attachment,
      uploadStatus: attachment.uploadStatus ?? "pending",
    });
  }

  return next;
}

function withAttachmentUploadState(
  attachments: LocalAttachment[],
  attachmentId: string,
  patch: Partial<LocalAttachment>,
) {
  return attachments.map((attachment) =>
    attachment.id === attachmentId ? { ...attachment, ...patch } : attachment,
  );
}

export function ChatAttachmentsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const generateAttachmentUploadUrl = useMutation(
    api.agents.generateAttachmentUploadUrl,
  );
  const uploadGenerationRef = useRef(0);

  const queueUpload = useCallback(
    (attachmentId: string) => {
      const generation = uploadGenerationRef.current;
      void (async () => {
        let attachmentToUpload: LocalAttachment | undefined;
        setAttachments((prev) => {
          attachmentToUpload = prev.find(
            (attachment) => attachment.id === attachmentId,
          );
          if (
            !attachmentToUpload ||
            attachmentToUpload.uploadStatus === "ready" ||
            attachmentToUpload.uploadStatus === "uploading"
          ) {
            return prev;
          }

          return withAttachmentUploadState(prev, attachmentId, {
            uploadStatus: "uploading",
            uploadError: undefined,
          });
        });

        if (!attachmentToUpload || attachmentToUpload.uploadStatus === "ready") {
          return;
        }

        try {
          const uploaded = await uploadLocalAttachment(attachmentToUpload, async () => {
            const url = await generateAttachmentUploadUrl({});
            return url ?? null;
          });

          if (uploadGenerationRef.current !== generation) {
            return;
          }

          setAttachments((prev) =>
            withAttachmentUploadState(prev, attachmentId, {
              uploadStatus: "ready",
              storageId: uploaded.storageId,
              uploadError: undefined,
            }),
          );
        } catch (error) {
          if (uploadGenerationRef.current !== generation) {
            return;
          }

          const message =
            error instanceof Error ? error.message : "Upload failed";
          setAttachments((prev) =>
            withAttachmentUploadState(prev, attachmentId, {
              uploadStatus: "failed",
              uploadError: message,
            }),
          );
        }
      })();
    },
    [generateAttachmentUploadUrl],
  );

  const addAttachments = useCallback(
    (incoming: LocalAttachment[]) => {
      setAttachments((current) => mergeAttachments(current, incoming));
      for (const attachment of incoming) {
        queueUpload(attachment.id);
      }
    },
    [queueUpload],
  );

  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId),
    );
  }, []);

  const clearAttachments = useCallback(() => {
    uploadGenerationRef.current += 1;
    setAttachments([]);
  }, []);

  const hasUploadingAttachments = useMemo(
    () =>
      attachments.some(
        (attachment) =>
          attachment.uploadStatus === "pending" ||
          attachment.uploadStatus === "uploading",
      ),
    [attachments],
  );

  const value = useMemo(
    () => ({
      attachments,
      addAttachments,
      removeAttachment,
      clearAttachments,
      hasUploadingAttachments,
    }),
    [
      attachments,
      addAttachments,
      removeAttachment,
      clearAttachments,
      hasUploadingAttachments,
    ],
  );

  return (
    <ChatAttachmentsContext value={value}>
      {children}
    </ChatAttachmentsContext>
  );
}

export function useChatAttachments() {
  const context = use(ChatAttachmentsContext);
  if (!context) {
    throw new Error(
      "useChatAttachments must be used within <ChatAttachmentsProvider>",
    );
  }
  return context;
}
