export type LocalAttachmentSource = "files" | "photos" | "camera";

export type LocalAttachment = {
  id: string;
  uri: string;
  filename: string;
  mediaType: string;
  size?: number;
  source: LocalAttachmentSource;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  csv: "text/csv",
  gif: "image/gif",
  heic: "image/heic",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  json: "application/json",
  md: "text/markdown",
  pdf: "application/pdf",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain",
  webp: "image/webp",
};

export function inferMediaTypeFromName(name?: string | null) {
  if (!name) {
    return undefined;
  }

  const parts = name.toLowerCase().split(".");
  const extension = parts[parts.length - 1];
  if (!extension || extension === name.toLowerCase()) {
    return undefined;
  }

  return MIME_BY_EXTENSION[extension];
}

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
