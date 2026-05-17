import { Icon } from "@/components/icon";
import { Image } from "@/components/tw";
import { useChatAttachments } from "@/components/chat/attachment-context";
import {
  formatAttachmentKind,
  type LocalAttachment,
} from "@/components/chat/attachment-types";
import { File, X } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: LocalAttachment;
  onRemove: (attachmentId: string) => void;
}) {
  const isImage = attachment.mediaType.startsWith("image/");

  return (
    <View
      className="mr-2 flex-row items-center gap-2 rounded-2xl border border-border/70 bg-card/95 px-2.5 py-2"
      style={{ borderCurve: "continuous" }}
    >
      {isImage ? (
        <Image
          source={{ uri: attachment.uri }}
          className="h-8 w-8 rounded-lg bg-secondary"
          contentFit="cover"
        />
      ) : (
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Icon icon={File} className="h-4 w-4 text-foreground" />
        </View>
      )}
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

export function AttachmentChipList() {
  const { attachments, removeAttachment } = useChatAttachments();

  if (attachments.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="px-3 pt-3"
    >
      {attachments.map((attachment) => (
        <AttachmentChip
          key={attachment.id}
          attachment={attachment}
          onRemove={removeAttachment}
        />
      ))}
    </ScrollView>
  );
}
