import { AndroidGrabber } from "@/components/grabber";
import { Icon } from "@/components/icon";
import { Image } from "@/components/tw";
import { useModel } from "@/components/model-context";
import {
  formatAttachmentKind,
  formatAttachmentSize,
  inferMediaTypeFromName,
  type LocalAttachment,
  type LocalAttachmentSource,
} from "@/components/chat/attachment-types";
import { useChatAttachments } from "@/components/chat/attachment-context";
import { isAttachmentMediaTypeAllowed } from "@chat/shared";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Camera,
  Check,
  File,
  Image as ImageIcon,
  Info,
  Paperclip,
  TriangleAlert,
  X,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type SheetStatusKind =
  | "idle"
  | "loading"
  | "cancelled"
  | "permission-denied"
  | "unsupported"
  | "error";

type SheetStatus = {
  kind: SheetStatusKind;
  message?: string;
};

const STATUS_TONE_COLOR: Record<Exclude<SheetStatusKind, "idle">, string> = {
  loading: "#2563EB",
  cancelled: "#D97706",
  "permission-denied": "#D97706",
  unsupported: "#DC2626",
  error: "#DC2626",
};

function createAttachmentId(source: LocalAttachmentSource, index: number) {
  return `${source}-${Date.now()}-${index}-${Math.round(Math.random() * 1e6)}`;
}

function createLocalAttachment(args: {
  source: LocalAttachmentSource;
  uri: string;
  filename?: string | null;
  mediaType?: string | null;
  size?: number;
  index: number;
}): LocalAttachment {
  const fallbackName =
    args.source === "camera"
      ? `camera-${Date.now()}.jpg`
      : `${args.source}-${Date.now()}-${args.index}`;
  const filename = args.filename?.trim() || fallbackName;
  const mediaType =
    args.mediaType?.trim() ||
    inferMediaTypeFromName(filename) ||
    (args.source === "files" ? "application/octet-stream" : "image/jpeg");

  return {
    id: createAttachmentId(args.source, args.index),
    uri: args.uri,
    filename,
    mediaType,
    size: args.size,
    source: args.source,
  };
}

function AttachmentSourceButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: typeof Camera;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-1 items-center gap-2 rounded-2xl border border-border/70 bg-card px-3 py-4 active:bg-muted"
      style={{ borderCurve: "continuous", opacity: disabled ? 0.45 : 1 }}
    >
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
        <Icon icon={icon} className="h-5 w-5 text-foreground" />
      </View>
      <Text className="text-[13px] font-medium text-foreground">{label}</Text>
    </Pressable>
  );
}

function StatusBanner({ status }: { status: SheetStatus }) {
  if (status.kind === "idle") {
    return null;
  }

  const tone = STATUS_TONE_COLOR[status.kind];
  const IconComponent =
    status.kind === "loading"
      ? Info
      : status.kind === "cancelled"
        ? TriangleAlert
        : status.kind === "permission-denied"
          ? AlertCircle
          : status.kind === "unsupported"
            ? TriangleAlert
            : AlertCircle;

  return (
    <View
      className="mx-5 mt-2 flex-row items-start gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3"
      style={{ borderCurve: "continuous" }}
    >
      <Icon
        icon={IconComponent}
        style={{ width: 16, height: 16, color: tone, marginTop: 2 }}
      />
      <Text className="flex-1 text-sm leading-5 text-foreground">
        {status.message}
      </Text>
    </View>
  );
}

function AttachmentPreviewRow({
  attachment,
  onRemove,
}: {
  attachment: LocalAttachment;
  onRemove: (attachmentId: string) => void;
}) {
  const isImage = attachment.mediaType.startsWith("image/");

  return (
    <View
      className="flex-row items-center gap-3 rounded-2xl border border-border/70 bg-card px-3 py-3"
      style={{ borderCurve: "continuous" }}
    >
      {isImage ? (
        <Image
          source={{ uri: attachment.uri }}
          className="h-14 w-14 rounded-xl bg-secondary"
          contentFit="cover"
        />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-xl bg-secondary">
          <Icon icon={File} className="h-5 w-5 text-foreground" />
        </View>
      )}
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
          {attachment.filename}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {formatAttachmentKind(attachment.mediaType)} •{" "}
          {formatAttachmentSize(attachment.size)}
        </Text>
      </View>
      <Pressable
        onPress={() => onRemove(attachment.id)}
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:bg-muted"
        style={{ borderCurve: "continuous" }}
      >
        <Icon icon={X} className="h-4 w-4 text-muted-foreground" />
      </Pressable>
    </View>
  );
}

export function ChatAttachmentSheet() {
  const router = useRouter();
  const { attachments, addAttachments, removeAttachment } = useChatAttachments();
  const {
    attachmentMediaTypes,
    attachmentsSupported,
    imageAttachmentsSupported,
    selectedModel,
  } = useModel();
  const [status, setStatus] = useState<SheetStatus>({ kind: "idle" });
  const selectedCountLabel =
    attachments.length === 1
      ? "1 file selected"
      : `${attachments.length} files selected`;

  const validateAttachments = useCallback(
    (nextAttachments: LocalAttachment[]) => {
      if (!attachmentsSupported) {
        setStatus({
          kind: "unsupported",
          message: `${selectedModel} does not accept attachments right now.`,
        });
        return [];
      }

      const accepted = nextAttachments.filter((attachment) =>
        isAttachmentMediaTypeAllowed(attachment.mediaType, attachmentMediaTypes),
      );

      const rejectedCount = nextAttachments.length - accepted.length;
      if (accepted.length === 0) {
        setStatus({
          kind: "unsupported",
          message:
            rejectedCount > 0
              ? `${selectedModel} only accepts ${attachmentMediaTypes.join(", ")}.`
              : "No supported files were selected.",
        });
        return [];
      }

      setStatus(
        rejectedCount > 0
          ? {
              kind: "unsupported",
              message: `${accepted.length} file${accepted.length === 1 ? "" : "s"} added. ${rejectedCount} skipped because ${selectedModel} only accepts ${attachmentMediaTypes.join(", ")}.`,
            }
          : {
              kind: "idle",
            },
      );

      return accepted;
    },
    [attachmentMediaTypes, attachmentsSupported, selectedModel],
  );

  const onPickFiles = useCallback(async () => {
    if (!attachmentsSupported) {
      setStatus({
        kind: "unsupported",
        message: `${selectedModel} does not accept attachments right now.`,
      });
      return;
    }

    setStatus({ kind: "loading", message: "Opening Files…" });
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: attachmentMediaTypes.length > 0 ? attachmentMediaTypes : "*/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setStatus({ kind: "cancelled", message: "File selection was cancelled." });
        return;
      }

      const accepted = validateAttachments(
        result.assets.map((asset, index) =>
          createLocalAttachment({
            source: "files",
            uri: asset.uri,
            filename: asset.name,
            mediaType:
              asset.mimeType || inferMediaTypeFromName(asset.name) || undefined,
            size: asset.size,
            index,
          }),
        ),
      );

      if (accepted.length > 0) {
        Haptics.selectionAsync();
        addAttachments(accepted);
      }
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to open the file picker.",
      });
    }
  }, [
    addAttachments,
    attachmentMediaTypes,
    attachmentsSupported,
    selectedModel,
    validateAttachments,
  ]);

  const onPickPhotos = useCallback(async () => {
    if (!imageAttachmentsSupported) {
      setStatus({
        kind: "unsupported",
        message: `${selectedModel} does not accept image attachments.`,
      });
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync(true);
    if (!permission.granted) {
      setStatus({
        kind: "permission-denied",
        message: "Photo library permission is required to choose images.",
      });
      return;
    }

    setStatus({ kind: "loading", message: "Opening Photos…" });
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 1,
        selectionLimit: 10,
      });

      if (result.canceled) {
        setStatus({ kind: "cancelled", message: "Photo selection was cancelled." });
        return;
      }

      const accepted = validateAttachments(
        result.assets.map((asset, index) =>
          createLocalAttachment({
            source: "photos",
            uri: asset.uri,
            filename: asset.fileName,
            mediaType:
              asset.mimeType ||
              inferMediaTypeFromName(asset.fileName) ||
              "image/jpeg",
            size: asset.fileSize,
            index,
          }),
        ),
      );

      if (accepted.length > 0) {
        Haptics.selectionAsync();
        addAttachments(accepted);
      }
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to open the photo library.",
      });
    }
  }, [
    addAttachments,
    imageAttachmentsSupported,
    selectedModel,
    validateAttachments,
  ]);

  const onTakePhoto = useCallback(async () => {
    if (!imageAttachmentsSupported) {
      setStatus({
        kind: "unsupported",
        message: `${selectedModel} does not accept image attachments.`,
      });
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setStatus({
        kind: "permission-denied",
        message: "Camera permission is required to capture a photo.",
      });
      return;
    }

    setStatus({ kind: "loading", message: "Opening Camera…" });
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 1,
      });

      if (result.canceled) {
        setStatus({ kind: "cancelled", message: "Camera capture was cancelled." });
        return;
      }

      const accepted = validateAttachments(
        result.assets.map((asset, index) =>
          createLocalAttachment({
            source: "camera",
            uri: asset.uri,
            filename: asset.fileName,
            mediaType:
              asset.mimeType ||
              inferMediaTypeFromName(asset.fileName) ||
              "image/jpeg",
            size: asset.fileSize,
            index,
          }),
        ),
      );

      if (accepted.length > 0) {
        Haptics.selectionAsync();
        addAttachments(accepted);
      }
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to open the camera.",
      });
    }
  }, [
    addAttachments,
    imageAttachmentsSupported,
    selectedModel,
    validateAttachments,
  ]);

  const helperText = useMemo(() => {
    if (!attachmentsSupported) {
      return `${selectedModel} does not currently allow attachments.`;
    }
    return `Allowed for ${selectedModel}: ${attachmentMediaTypes.join(", ")}`;
  }, [attachmentMediaTypes, attachmentsSupported, selectedModel]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-28"
        contentInsetAdjustmentBehavior="automatic"
      >
        <AndroidGrabber />

        <View className="gap-2 px-5 pt-2">
          <Text className="text-2xl font-semibold text-foreground">
            Select file
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            Add files now and send them with your next chat message.
          </Text>
        </View>

        <StatusBanner status={status} />

        <View className="gap-3 px-5 pt-4">
          <View className="flex-row gap-3">
            <AttachmentSourceButton
              icon={Camera}
              label="Camera"
              disabled={!imageAttachmentsSupported}
              onPress={onTakePhoto}
            />
            <AttachmentSourceButton
              icon={ImageIcon}
              label="Photos"
              disabled={!imageAttachmentsSupported}
              onPress={onPickPhotos}
            />
            <AttachmentSourceButton
              icon={Paperclip}
              label="Files"
              disabled={!attachmentsSupported}
              onPress={onPickFiles}
            />
          </View>

          <View
            className="rounded-2xl border border-border/70 bg-card px-4 py-3"
            style={{ borderCurve: "continuous" }}
          >
            <Text className="text-sm font-medium text-foreground">
              {attachments.length > 0 ? selectedCountLabel : "No files selected"}
            </Text>
            <Text className="mt-1 text-xs leading-5 text-muted-foreground">
              {helperText}
            </Text>
          </View>
        </View>

        <View className="gap-3 px-5 pt-4">
          {attachments.length === 0 ? (
            <View
              className="items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-card px-5 py-10"
              style={{ borderCurve: "continuous" }}
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                <Icon icon={Check} className="h-5 w-5 text-muted-foreground" />
              </View>
              <Text className="text-sm font-medium text-foreground">
                Your selected files will appear here
              </Text>
              <Text className="text-center text-xs leading-5 text-muted-foreground">
                Pick files, photos, or a camera image and they will stay attached
                until you send or remove them.
              </Text>
            </View>
          ) : (
            attachments.map((attachment) => (
              <AttachmentPreviewRow
                key={attachment.id}
                attachment={attachment}
                onRemove={removeAttachment}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0 border-t border-border/70 bg-background/95 px-5 pb-8 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="items-center justify-center rounded-2xl bg-foreground px-4 py-3 active:opacity-80"
          style={{ borderCurve: "continuous" }}
        >
          <Text className="text-sm font-semibold text-background">Done</Text>
        </Pressable>
      </View>
    </View>
  );
}
