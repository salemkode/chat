import { Icon } from "@/components/icon";
import { Image } from "@/components/tw";
import { useChatAttachments } from "@/components/chat/attachment-context";
import {
  formatAttachmentKind,
  type LocalAttachment,
} from "@/components/chat/attachment-types";
import { File, X } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

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
      <Image
        source={{ uri: attachment.uri }}
        className="h-full w-full rounded-2xl border border-border/60 bg-secondary"
        style={{ borderCurve: "continuous" }}
        contentFit="cover"
      />
      <Pressable
        onPress={() => onRemove(attachment.id)}
        hitSlop={8}
        className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-card active:bg-muted"
        style={{ borderCurve: "continuous" }}
      >
        <Icon icon={X} className="h-3.5 w-3.5 text-foreground" />
      </Pressable>
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
      className="mr-2 flex-row items-center gap-2 rounded-2xl border border-border/70 bg-card/95 px-2.5 py-2"
      style={{ borderCurve: "continuous" }}
    >
      <View className="h-8 w-8 items-center justify-center rounded-lg bg-secondary">
        <Icon icon={File} className="h-4 w-4 text-foreground" />
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
export function AttachmentChipList() {
  const { attachments, removeAttachment } = useChatAttachments();

  if (attachments.length === 0) {
    return null;
  }

  const imageAttachments = attachments.filter((attachment) =>
    attachment.mediaType.startsWith("image/"),
  );
  const fileAttachments = attachments.filter(
    (attachment) => !attachment.mediaType.startsWith("image/"),
  );

  return (
    <View className="px-3 pb-1 pt-2">
      {imageAttachments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-0.5 pb-2"
        >
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
          contentContainerClassName="pb-1"
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
