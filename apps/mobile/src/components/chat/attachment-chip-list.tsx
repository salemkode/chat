import { Icon } from "@/components/icon";
import { Image } from "@/components/tw";
import { useChatAttachments } from "@/components/chat/attachment-context";
import {
  formatAttachmentKind,
  type LocalAttachment,
} from "@/components/chat/attachment-types";
import { ActivityIndicator } from "react-native";
import { File, X } from "lucide-react-native";
import { type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { cn } from "@/utils/tailwind";

import {
  COMPOSER_CONTENT_INSET_CLASS,
  COMPOSER_FLOATING_PILL_RADIUS,
  COMPOSER_FLOATING_PILL_STYLE,
  COMPOSER_FLOATING_SOLID_CLASS,
  COMPOSER_FLOATING_SURFACE_STYLE,
} from "./composer-layout";

const THUMB_SIZE = 72;

function FloatingImageThumbnail({
  attachment,
  onRemove,
}: {
  attachment: LocalAttachment;
  onRemove: (attachmentId: string) => void;
}) {
  return (
    <View
      className="relative mr-2.5"
      style={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 8,
      }}
    >
      <View className="relative h-full w-full">
        <Image
          source={{ uri: attachment.uri }}
          className={cn(
            "h-full w-full border border-border/50 bg-card shadow-composer",
          )}
          style={{ borderRadius: COMPOSER_FLOATING_PILL_RADIUS }}
          contentFit="cover"
        />
        <UploadStatusOverlay attachment={attachment} />
      </View>
      <Pressable
        onPress={() => onRemove(attachment.id)}
        hitSlop={8}
        className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full border border-border bg-card active:bg-muted"
        style={COMPOSER_FLOATING_SURFACE_STYLE}
      >
        <Icon icon={X} className="h-3.5 w-3.5 text-foreground" />
      </Pressable>
    </View>
  );
}

function UploadStatusOverlay({
  attachment,
}: {
  attachment: LocalAttachment;
}) {
  if (
    attachment.uploadStatus !== "pending" &&
    attachment.uploadStatus !== "uploading"
  ) {
    return null;
  }

  return (
    <View className="absolute inset-0 items-center justify-center rounded-2xl bg-card/85">
      <ActivityIndicator size="small" />
    </View>
  );
}

function FileAttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: LocalAttachment;
  onRemove: (attachmentId: string) => void;
}) {
  return (
    <View
      className={cn(
        "relative mr-2 flex-row items-center gap-2.5 px-3 py-2",
        COMPOSER_FLOATING_SOLID_CLASS,
      )}
      style={[COMPOSER_FLOATING_PILL_STYLE, COMPOSER_FLOATING_SURFACE_STYLE]}
    >
      <View className="relative h-8 w-8 items-center justify-center rounded-lg bg-secondary">
        <Icon icon={File} className="h-4 w-4 text-foreground" />
        <UploadStatusOverlay attachment={attachment} />
      </View>
      <View className="max-w-36 min-w-0">
        <Text className="text-xs font-medium text-foreground" numberOfLines={1}>
          {attachment.filename}
        </Text>
        <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
          {formatAttachmentKind(attachment.mediaType)}
        </Text>
      </View>
      <Pressable
        onPress={() => onRemove(attachment.id)}
        hitSlop={8}
        className="h-6 w-6 items-center justify-center rounded-full bg-secondary active:bg-muted"
        style={{ borderCurve: "continuous" }}
      >
        <Icon icon={X} className="h-3.5 w-3.5 text-muted-foreground" />
      </Pressable>
    </View>
  );
}

/** Image thumbnails and file chips shown above the composer. */
export function AttachmentChipList({
  leadingContent,
}: {
  leadingContent?: ReactNode;
}) {
  const { attachments, removeAttachment } = useChatAttachments();

  const imageAttachments = attachments.filter((attachment) =>
    attachment.mediaType.startsWith("image/"),
  );
  const fileAttachments = attachments.filter(
    (attachment) => !attachment.mediaType.startsWith("image/"),
  );

  const hasImageRow = imageAttachments.length > 0 || Boolean(leadingContent);

  if (!hasImageRow && fileAttachments.length === 0) {
    return null;
  }

  return (
    <View className={COMPOSER_CONTENT_INSET_CLASS}>
      {hasImageRow ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="pt-2"
          contentContainerClassName="items-center pb-2"
        >
          {leadingContent}
          {imageAttachments.map((attachment) => (
            <FloatingImageThumbnail
              key={attachment.id}
              attachment={attachment}
              onRemove={removeAttachment}
            />
          ))}
        </ScrollView>
      ) : null}
      {fileAttachments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="items-center pb-1"
        >
          {fileAttachments.map((attachment) => (
            <FileAttachmentChip
              key={attachment.id}
              attachment={attachment}
              onRemove={removeAttachment}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
