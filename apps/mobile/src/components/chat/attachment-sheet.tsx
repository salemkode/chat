import { AndroidGrabber } from "@/components/grabber";
import { Icon } from "@/components/icon";
import { useModel } from "@/components/model-context";
import { useChatComposerOptions } from "@/components/chat/composer-options-context";
import {
  inferMediaTypeFromName,
  type LocalAttachment,
  type LocalAttachmentSource,
} from "@/components/chat/attachment-types";
import { useChatAttachments } from "@/components/chat/attachment-context";
import {
  modelAcceptsNonImageAttachments,
  unsupportedAttachmentsMessage,
} from "@/lib/attachment-capability-messages";
import { pickMultipleImages, takePhoto } from "@/lib/image-picker";
import { pickDocuments } from "@/lib/document-picker";
import { threadSelection$ } from "@/state/thread-selection";
import { useChatCoreContext, useChatProjects } from "@chat/chat-core";
import { api } from "@convex/_generated/api";
import { isAttachmentMediaTypeAllowed, mediaTypeMatchesPattern } from "@chat/shared";
import { useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
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
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSelector } from "@legendapp/state/react";

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

function getFilePickerMediaTypes(attachmentMediaTypes: string[]) {
  const nonImageTypes = attachmentMediaTypes.filter(
    (pattern) => !mediaTypeMatchesPattern("image/jpeg", pattern),
  );
  return nonImageTypes.length > 0 ? nonImageTypes : attachmentMediaTypes;
}

function isConcurrentPickerError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("document picking in progress");
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
      disabled={disabled}
      className="flex-1 items-center gap-2 rounded-xl border border-border bg-secondary py-3 active:bg-muted border-continuous"
      style={{ opacity: disabled ? 0.45 : 1 }}
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
    <View className="mx-5 mt-2 flex-row items-start gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
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

export function ChatAttachmentSheet() {
  const router = useRouter();
  const { addAttachments } = useChatAttachments();
  const { searchEnabled, setSearchEnabled } = useChatComposerOptions();
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
  const [pickerBusy, setPickerBusy] = useState(false);

  const runPickerSession = useCallback(
    async (session: () => Promise<void>) => {
      if (pickerBusy) {
        return;
      }

      setPickerBusy(true);
      try {
        await session();
      } finally {
        setPickerBusy(false);
      }
    },
    [pickerBusy],
  );

  const fileAttachmentsSupported = useMemo(
    () => modelAcceptsNonImageAttachments(attachmentMediaTypes),
    [attachmentMediaTypes],
  );

  const filePickerMediaTypes = useMemo(
    () => getFilePickerMediaTypes(attachmentMediaTypes),
    [attachmentMediaTypes],
  );

  const showImageSources = imageAttachmentsSupported;
  const showFileSource = fileAttachmentsSupported;

  const projectDetail = useMemo(() => {
    const projectId = threadId ? threadProject?.id : pendingProjectId;
    if (!projectId) {
      return "None";
    }
    return (
      projects.find((project) => project.id === projectId)?.name ??
      threadProject?.name ??
      "Project"
    );
  }, [pendingProjectId, projects, threadId, threadProject?.id, threadProject?.name]);

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
              ? `${selectedModel} only accepts ${attachmentMediaTypes.join(", ")}.`
              : "No supported files were selected.",
        });
        return [];
      }

      if (rejectedCount > 0) {
        setStatus({
          kind: "unsupported",
          message: `${accepted.length} file${accepted.length === 1 ? "" : "s"} added. ${rejectedCount} skipped.`,
        });
      }

      return accepted;
    },
    [attachmentMediaTypes, attachmentsSupported, selectedModel],
  );

  const onPickFiles = useCallback(() => {
    if (!fileAttachmentsSupported) {
      return;
    }

    void runPickerSession(async () => {
      setStatus({ kind: "loading", message: "Opening Files…" });
      try {
        const result = await pickDocuments({
          type: filePickerMediaTypes,
          multiple: true,
        });

        if (!result) {
          setStatus({ kind: "idle" });
          return;
        }

        if (result.canceled) {
          setStatus({
            kind: "cancelled",
            message: "File selection was cancelled.",
          });
          return;
        }

        const accepted = validateAttachments(
          result.assets.map((asset, index) =>
            createLocalAttachment({
              source: "files",
              uri: asset.uri,
              filename: asset.name,
              mediaType:
                asset.mimeType ||
                inferMediaTypeFromName(asset.name) ||
                undefined,
              size: asset.size,
              index,
            }),
          ),
        );

        commitAttachments(accepted);
      } catch (error) {
        if (isConcurrentPickerError(error)) {
          setStatus({ kind: "idle" });
          return;
        }
        setStatus({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to open the file picker.",
        });
      }
    });
  }, [
    commitAttachments,
    fileAttachmentsSupported,
    filePickerMediaTypes,
    runPickerSession,
    validateAttachments,
  ]);

  const onPickPhotos = useCallback(() => {
    if (!imageAttachmentsSupported) {
      return;
    }

    void runPickerSession(async () => {
      setStatus({ kind: "loading", message: "Opening Photos…" });
      try {
        const assets = await pickMultipleImages(10);

        if (assets.length === 0) {
          setStatus({
            kind: "cancelled",
            message: "Photo selection was cancelled.",
          });
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
        if (isConcurrentPickerError(error)) {
          setStatus({ kind: "idle" });
          return;
        }
        setStatus({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to open the photo library.",
        });
      }
    });
  }, [
    commitAttachments,
    imageAttachmentsSupported,
    runPickerSession,
    validateAttachments,
  ]);

  const onTakePhoto = useCallback(() => {
    if (!imageAttachmentsSupported) {
      return;
    }

    void runPickerSession(async () => {
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
                ? "Camera permission is required to capture a photo."
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
        if (isConcurrentPickerError(error)) {
          setStatus({ kind: "idle" });
          return;
        }
        setStatus({
          kind: "error",
          message:
            error instanceof Error ? error.message : "Unable to open the camera.",
        });
      }
    });
  }, [
    commitAttachments,
    imageAttachmentsSupported,
    runPickerSession,
    validateAttachments,
  ]);

  const sourcesDisabled = pickerBusy || status.kind === "loading";

  return (
    <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
      <AndroidGrabber />

      <StatusBanner status={status} />

      {showImageSources || showFileSource ? (
        <View className="flex-row gap-3 px-5 pt-2 pb-4">
          {showImageSources ? (
            <>
              <AttachmentButton
                icon={Camera}
                label="Camera"
                disabled={sourcesDisabled}
                onPress={onTakePhoto}
              />
              <AttachmentButton
                icon={ImageIcon}
                label="Photos"
                disabled={sourcesDisabled}
                onPress={onPickPhotos}
              />
            </>
          ) : null}
          {showFileSource ? (
            <AttachmentButton
              icon={File}
              label="Files"
              disabled={sourcesDisabled}
              onPress={onPickFiles}
            />
          ) : null}
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
