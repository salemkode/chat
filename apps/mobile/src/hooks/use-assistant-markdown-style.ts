import type { MarkdownStyle } from "react-native-enriched-markdown";
import { useMemo } from "react";
import { useNativeThemeColors } from "@/hooks/use-native-theme-colors";

export type AssistantMarkdownStyleResult = {
  style: MarkdownStyle;
  /** Changes when light/dark/system theme changes — use as React key to refresh native markdown. */
  themeKey: string;
};

/** Theme-aware markdown styles for native assistant messages (StreamdownText). */
export function useAssistantMarkdownStyle(): AssistantMarkdownStyleResult {
  const {
    theme,
    foreground: text,
    mutedForeground: textMuted,
    border: borderColor,
    card: cardBg,
    secondary: secondaryBg,
    muted: mutedBg,
    accent: accentBg,
    link: linkColor,
  } = useNativeThemeColors();

  const style = useMemo(
    () => ({
      paragraph: { color: text, fontSize: 16, lineHeight: 22 },
      h1: { color: text },
      h2: { color: text },
      h3: { color: text },
      h4: { color: text },
      h5: { color: text },
      h6: { color: text },
      blockquote: {
        color: text,
        backgroundColor: mutedBg,
        borderColor: borderColor,
      },
      codeBlock: {
        backgroundColor: accentBg,
        borderColor: borderColor,
        color: text,
      },
      code: {
        color: text,
        backgroundColor: accentBg,
        borderColor: borderColor,
      },
      link: { color: linkColor },
      list: {
        color: text,
        bulletColor: textMuted,
        markerColor: textMuted,
      },
      strong: { color: text },
      em: { color: text },
      strikethrough: { color: textMuted },
      thematicBreak: { color: borderColor },
      table: {
        color: text,
        fontSize: 14,
        lineHeight: 20,
        borderColor: borderColor,
        borderRadius: 10,
        borderWidth: 1,
        headerBackgroundColor: secondaryBg,
        headerTextColor: text,
        rowEvenBackgroundColor: cardBg,
        rowOddBackgroundColor: mutedBg,
        cellPaddingHorizontal: 12,
        cellPaddingVertical: 10,
      },
      taskList: {
        borderColor: borderColor,
        checkedColor: linkColor,
        checkedTextColor: textMuted,
        checkmarkColor: cardBg,
      },
    }),
    [
      accentBg,
      borderColor,
      cardBg,
      linkColor,
      mutedBg,
      secondaryBg,
      text,
      textMuted,
      theme,
    ],
  );

  return { style, themeKey: theme };
}
