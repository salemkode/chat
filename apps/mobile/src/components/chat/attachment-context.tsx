import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  attachmentFingerprint,
  type LocalAttachment,
} from "./attachment-types";

type ChatAttachmentsContextValue = {
  attachments: LocalAttachment[];
  addAttachments: (attachments: LocalAttachment[]) => void;
  removeAttachment: (attachmentId: string) => void;
  clearAttachments: () => void;
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
    next.push(attachment);
  }

  return next;
}

export function ChatAttachmentsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);

  const addAttachments = useCallback((incoming: LocalAttachment[]) => {
    setAttachments((current) => mergeAttachments(current, incoming));
  }, []);

  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId),
    );
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const value = useMemo(
    () => ({
      attachments,
      addAttachments,
      removeAttachment,
      clearAttachments,
    }),
    [attachments, addAttachments, removeAttachment, clearAttachments],
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
