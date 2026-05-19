import type { Id } from "@convex/_generated/dataModel";
import {
  inferMediaTypeFromName,
  normalizeAttachmentFilename,
  resolveAttachmentMediaType,
} from "@chat/shared/logic/attachment-metadata";

export type LocalAttachmentSource = "files" | "photos" | "camera";

export { inferMediaTypeFromName, normalizeAttachmentFilename, resolveAttachmentMediaType };

export type AttachmentUploadStatus =
  | "pending"
  | "uploading"
  | "ready"
  | "failed";

export type LocalAttachment = {
  id: string;
  uri: string;
  filename: string;
  mediaType: string;
  size?: number;
  source: LocalAttachmentSource;
  uploadStatus?: AttachmentUploadStatus;
  storageId?: Id<"_storage">;
  uploadError?: string;
};

export function formatAttachmentSize(size?: number) {
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
    return "Unknown size";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatAttachmentKind(mediaType: string) {
  if (mediaType.startsWith("image/")) {
    return "Image";
  }

  if (mediaType === "application/pdf") {
    return "PDF";
  }

  if (mediaType.startsWith("text/")) {
    return "Text";
  }

  return "File";
}

export function attachmentFingerprint(attachment: LocalAttachment) {
  return [
    attachment.uri,
    attachment.filename,
    attachment.mediaType,
    attachment.size ?? "",
    attachment.source,
  ].join("|");
}
