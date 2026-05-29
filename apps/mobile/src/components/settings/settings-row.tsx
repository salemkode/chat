import { Icon } from "@/components/icon";
import { Link, type Href } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, Switch, Text, View } from "react-native";

export function SettingsSectionDivider() {
  return <View className="mx-4 h-px bg-border/80" />;
}

export function SettingsRow({
  icon,
  label,
  detail,
  description,
  href,
  onPress,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  detail?: string;
  description?: string;
  href?: Href;
  onPress?: () => void;
  tone?: "default" | "destructive";
}) {
  const iconClassName =
    tone === "destructive" ? "w-5 h-5 text-red-500" : "w-5 h-5 text-foreground";
  const labelClassName =
    tone === "destructive"
      ? "text-[16px] font-medium text-red-500"
      : "text-[16px] font-medium text-foreground";

  const content = (
    <View className="flex-row items-center gap-4 px-4 py-4 active:bg-muted/60">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-muted">
        <Icon icon={icon} className={iconClassName} />
      </View>
      <View className="flex-1">
        <Text className={labelClassName}>{label}</Text>
        {description ? (
          <Text className="mt-1 text-[13px] leading-5 text-muted-foreground">
            {description}
          </Text>
        ) : null}
      </View>
      <View className="items-end gap-1">
        {detail ? (
          <Text className="text-[13px] font-medium text-muted-foreground">
            {detail}
          </Text>
        ) : null}
        <Icon
          icon={ChevronRight}
          className="h-3.5 w-3.5 text-muted-foreground"
        />
      </View>
    </View>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable>{content}</Pressable>
      </Link>
    );
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}

export function SettingsToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  icon?: LucideIcon;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="px-4 py-4">
      <View className="flex-row items-center gap-4">
        {icon ? (
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-muted">
            <Icon icon={icon} className="h-5 w-5 text-foreground" />
          </View>
        ) : null}
        <View className="flex-1">
          <Text className="text-[16px] font-medium text-foreground">{label}</Text>
          {description ? (
            <Text className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </Text>
          ) : null}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
        />
      </View>
    </View>
  );
}
