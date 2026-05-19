import {
  isAttachmentMediaTypeAllowed,
  mediaTypeMatchesPattern,
} from "@chat/shared";
import {
  CHAT_FILES_STILL_UPLOADING_MESSAGE,
  formatUserFacingError,
} from "@chat/shared/logic/user-facing-errors";
import type { LocalAttachment } from "@/components/chat/attachment-types";

export function modelAcceptsNonImageAttachments(
  attachmentMediaTypes: string[],
): boolean {
  return attachmentMediaTypes.some(
    (pattern) => !mediaTypeMatchesPattern("image/jpeg", pattern),
  );
}

export function unsupportedAttachmentsMessage(
  modelName: string,
): string {
  return `${modelName} doesn't support file attachments`;
}

export function unsupportedImageAttachmentsMessage(
  modelName: string,
  attachmentMediaTypes: string[],
): string {
  const acceptedTypes = attachmentMediaTypes.join(", ");
  if (acceptedTypes.length > 0) {
    return `${modelName} doesn't accept photos — try Files for ${acceptedTypes}`;
  }
  return `${modelName} doesn't accept image attachments`;
}

export function unsupportedFileAttachmentsMessage(
  modelName: string,
  attachmentMediaTypes: string[],
): string {
  return `${modelName} only accepts ${attachmentMediaTypes.join(", ")}`;
}

export function validateAttachmentsForSend(args: {
  attachments: LocalAttachment[];
  modelName: string;
  attachmentMediaTypes: string[];
  attachmentsSupported: boolean;
  imageAttachmentsSupported: boolean;
}): string | null {
  const {
    attachments,
    modelName,
    attachmentMediaTypes,
    attachmentsSupported,
    imageAttachmentsSupported,
  } = args;

  if (attachments.length === 0) {
    return null;
  }

  if (!attachmentsSupported) {
    return unsupportedAttachmentsMessage(modelName);
  }

  const hasUnsupportedImage = attachments.some(
    (attachment) =>
      attachment.mediaType.startsWith("image/") && !imageAttachmentsSupported,
  );
  if (hasUnsupportedImage) {
    return unsupportedImageAttachmentsMessage(modelName, attachmentMediaTypes);
  }

  const hasUnsupportedType = attachments.some(
    (attachment) =>
      !isAttachmentMediaTypeAllowed(
        attachment.mediaType,
        attachmentMediaTypes,
      ),
  );
  if (hasUnsupportedType) {
    return unsupportedFileAttachmentsMessage(modelName, attachmentMediaTypes);
  }

  const stillUploading = attachments.some(
    (attachment) =>
      attachment.uploadStatus === "pending" ||
      attachment.uploadStatus === "uploading",
  );
  if (stillUploading) {
    return CHAT_FILES_STILL_UPLOADING_MESSAGE;
  }

  const failedUpload = attachments.find(
    (attachment) => attachment.uploadStatus === "failed",
  );
  if (failedUpload) {
    return formatUserFacingError(
      failedUpload.uploadError ?? `Failed to upload ${failedUpload.filename}`,
    );
  }

  return null;
}
