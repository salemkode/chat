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
import { useChatComposerOptions } from "@/components/chat/composer-options-context";
import { useComposerToast } from "@/components/composer-toast";
import {
  unsupportedAttachmentsMessage,
  unsupportedFileAttachmentsMessage,
  unsupportedImageAttachmentsMessage,
} from "@/lib/attachment-capability-messages";
import { useChatCoreContext, useChatProjects } from "@chat/chat-core";
import { api } from "@convex/_generated/api";
import { isAttachmentMediaTypeAllowed } from "@chat/shared";
import { useQuery } from "convex/react";
import type { LucideIcon } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { pickMultipleImages, takePhoto } from "@/lib/image-picker";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Archive,
  Camera,
  ChevronRight,
  File,
  Globe,
  Image as ImageIcon,
  Info,
  TriangleAlert,
  X,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSelector } from "@legendapp/state/react";
import { threadSelection$ } from "@/state/thread-selection";

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

function AttachmentButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center gap-2 rounded-xl border border-border bg-card py-3 active:bg-muted border-continuous ${disabled ? "opacity-50" : ""}`}
    >
      <Icon icon={icon} className="h-6 w-6 text-foreground" />
      <Text className="text-[13px] text-foreground">{label}</Text>
    </Pressable>
  );
}

function ToggleRow({
  icon,
  label,
  badge,
  value,
  onValueChange,
}: {
  icon: LucideIcon;
  label: string;
  badge?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center gap-3.5 px-5 py-3">
      <Icon icon={icon} className="h-5 w-5 text-foreground" />
      <Text className="flex-1 text-[17px] text-foreground">{label}</Text>
      {badge ? (
        <View className="rounded bg-muted px-1.5 py-0.5">
          <Text className="text-[11px] font-medium text-muted-foreground">
            {badge}
          </Text>
        </View>
      ) : null}
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function DisclosureRow({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3.5 px-5 py-3.5 active:bg-muted"
    >
      <Icon icon={icon} className="h-5 w-5 text-foreground" />
      <Text className="flex-1 text-[17px] text-foreground">{label}</Text>
      <Text className="text-[15px] text-muted-foreground">{detail}</Text>
      <Icon icon={ChevronRight} className="h-3 w-3 text-muted-foreground" />
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
  const { searchEnabled, setSearchEnabled } = useChatComposerOptions();
  const { showComposerToast } = useComposerToast();
  const { projects } = useChatProjects();
  const { pendingProjectId } = useChatCoreContext();
  const threadId = useSelector(() => threadSelection$.selectedThreadId.get());
  const threadProject = useQuery(
    api.projects.getProjectForThread,
    threadId ? { threadId } : "skip",
  );
  const {
    attachmentMediaTypes,
    attachmentsSupported,
    imageAttachmentsSupported,
    selectedModel,
  } = useModel();
  const [status, setStatus] = useState<SheetStatus>({ kind: "idle" });

  const projectDetail = useMemo(() => {
    const projectId = threadId ? threadProject?.id : pendingProjectId;
    if (!projectId) {
      return "None";
    }
    return (
      projects.find((project) => project.id === projectId)?.name ?? "None"
    );
  }, [pendingProjectId, projects, threadId, threadProject?.id]);

  const showBlockedToast = useCallback(
    (message: string) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showComposerToast(message);
    },
    [showComposerToast],
  );

  const commitAttachments = useCallback(
    (accepted: LocalAttachment[]) => {
      if (accepted.length === 0) {
        return;
      }
      Haptics.selectionAsync();
      addAttachments(accepted);
      router.back();
    },
    [addAttachments, router],
  );

  const onPressCamera = useCallback(() => {
    if (!imageAttachmentsSupported) {
      showBlockedToast(
        unsupportedImageAttachmentsMessage(selectedModel, attachmentMediaTypes),
      );
    }
  }, [
    attachmentMediaTypes,
    imageAttachmentsSupported,
    selectedModel,
    showBlockedToast,
  ]);

  const onPressPhotos = onPressCamera;

  const onPressFiles = useCallback(() => {
    if (!attachmentsSupported) {
      showBlockedToast(unsupportedAttachmentsMessage(selectedModel));
    }
  }, [attachmentsSupported, selectedModel, showBlockedToast]);

  const validateAttachments = useCallback(
    (nextAttachments: LocalAttachment[]) => {
      if (!attachmentsSupported) {
        setStatus({
          kind: "unsupported",
          message: unsupportedAttachmentsMessage(selectedModel),
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
              ? unsupportedFileAttachmentsMessage(
                  selectedModel,
                  attachmentMediaTypes,
                )
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
      showBlockedToast(unsupportedAttachmentsMessage(selectedModel));
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

      commitAttachments(accepted);
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
    commitAttachments,
    attachmentMediaTypes,
    attachmentsSupported,
    selectedModel,
    showBlockedToast,
    validateAttachments,
  ]);

  const onPickPhotos = useCallback(async () => {
    if (!imageAttachmentsSupported) {
      showBlockedToast(
        unsupportedImageAttachmentsMessage(selectedModel, attachmentMediaTypes),
      );
      return;
    }

    setStatus({ kind: "loading", message: "Opening Photos…" });
    try {
      const assets = await pickMultipleImages(10);

      if (assets.length === 0) {
        setStatus({ kind: "cancelled", message: "Photo selection was cancelled." });
        return;
      }

      const accepted = validateAttachments(
        assets.map((asset, index) =>
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

      commitAttachments(accepted);
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
    commitAttachments,
    attachmentMediaTypes,
    imageAttachmentsSupported,
    selectedModel,
    showBlockedToast,
    validateAttachments,
  ]);

  const onTakePhoto = useCallback(async () => {
    if (!imageAttachmentsSupported) {
      showBlockedToast(
        unsupportedImageAttachmentsMessage(selectedModel, attachmentMediaTypes),
      );
      return;
    }

    setStatus({ kind: "loading", message: "Opening Camera…" });
    try {
      const photo = await takePhoto();

      if (!photo.ok) {
        setStatus({
          kind:
            photo.reason === "permission-denied"
              ? "permission-denied"
              : "cancelled",
          message:
            photo.reason === "permission-denied"
              ? "Camera permission is required to capture a photo. Please enable it in Settings."
              : "Camera capture was cancelled.",
        });
        return;
      }

      const asset = photo.image;
      const accepted = validateAttachments([
        createLocalAttachment({
          source: "camera",
          uri: asset.uri,
          filename: asset.fileName,
          mediaType:
            asset.mimeType ||
            inferMediaTypeFromName(asset.fileName) ||
            "image/jpeg",
          size: asset.fileSize,
          index: 0,
        }),
      ]);

      commitAttachments(accepted);
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Unable to open the camera.",
      });
    }
  }, [
    commitAttachments,
    attachmentMediaTypes,
    imageAttachmentsSupported,
    selectedModel,
    showBlockedToast,
    validateAttachments,
  ]);

  return (
    <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
      <AndroidGrabber />

      <StatusBanner status={status} />

      <View className="flex-row gap-3 px-5 pt-2 pb-4">
        <AttachmentButton
          icon={Camera}
          label="Camera"
          disabled={!imageAttachmentsSupported}
          onPress={
            imageAttachmentsSupported ? onTakePhoto : onPressCamera
          }
        />
        <AttachmentButton
          icon={ImageIcon}
          label="Photos"
          disabled={!imageAttachmentsSupported}
          onPress={imageAttachmentsSupported ? onPickPhotos : onPressPhotos}
        />
        <AttachmentButton
          icon={File}
          label="Files"
          disabled={!attachmentsSupported}
          onPress={attachmentsSupported ? onPickFiles : onPressFiles}
        />
      </View>

      {attachments.length > 0 ? (
        <View className="gap-3 px-5 pb-2">
          {attachments.map((attachment) => (
            <AttachmentPreviewRow
              key={attachment.id}
              attachment={attachment}
              onRemove={removeAttachment}
            />
          ))}
        </View>
      ) : null}

      <ToggleRow
        icon={Globe}
        label="Web search"
        badge="Beta"
        value={searchEnabled}
        onValueChange={setSearchEnabled}
      />

      <View className="mx-5 my-1 h-px bg-border" />

      <DisclosureRow
        icon={Archive}
        label="Add to project"
        detail={projectDetail}
        onPress={() => router.push("/attachments/project-picker")}
      />
    </ScrollView>
  );
}
