import type { Id } from "@convex/_generated/dataModel";
import { parseConvexIdForTable } from "@chat/shared/logic/convex-ids";
import type { LocalAttachment } from "@/components/chat/attachment-types";

function parseUploadResponse(value: unknown): { storageId: Id<"_storage"> } {
  if (
    typeof value !== "object" ||
    value === null ||
    !("storageId" in value) ||
    typeof value.storageId !== "string"
  ) {
    throw new Error("Upload response is missing storageId");
  }

  const storageId = parseConvexIdForTable("_storage", value.storageId);
  if (!storageId) {
    throw new Error("Upload response has an invalid storageId");
  }

  return { storageId };
}

export async function uploadLocalAttachment(
  attachment: LocalAttachment,
  generateUploadUrl: () => Promise<string | null>,
) {
  const uploadUrl = await generateUploadUrl();
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
}
