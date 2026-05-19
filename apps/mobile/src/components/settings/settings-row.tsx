import { Icon } from "@/components/icon";
import { Link } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, Switch, Text, View } from "react-native";

export function SettingsSectionDivider() {
  return <View className="h-px bg-border mx-5" />;
}

export function SettingsRow({
  icon,
  label,
  detail,
  href,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  detail?: string;
  href?: string;
  onPress?: () => void;
}) {
  const content = (
    <View className="flex-row items-center px-5 py-3.5 gap-4 active:bg-muted">
      <Icon icon={icon} className="w-5 h-5 text-foreground" />
      <Text className="flex-1 text-[17px] text-foreground">{label}</Text>
      {detail ? (
        <Text className="text-[15px] text-muted-foreground">{detail}</Text>
      ) : null}
      <Icon icon={ChevronRight} className="w-3.5 h-3.5 text-muted-foreground" />
    </View>
  );

  if (href) {
    return (
      <Link href={href as never} asChild>
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
    <View className="px-5 py-3 gap-3">
      <View className="flex-row items-center gap-4">
        {icon ? <Icon icon={icon} className="w-5 h-5 text-foreground" /> : null}
        <View className="flex-1">
          <Text className="text-[17px] text-foreground">{label}</Text>
          {description ? (
            <Text className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
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
