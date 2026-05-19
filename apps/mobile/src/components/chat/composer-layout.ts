/** Horizontal padding on the composer stack (`px-3`). */
export const COMPOSER_OUTER_HORIZONTAL_PADDING = 12;

/** Inner padding on the glass row that contains the + button. */
export const COMPOSER_GLASS_PADDING = 12;

/** `PromptInputAction` width — keep in sync with prompt-input.tsx. */
export const COMPOSER_ACTION_SIZE = 44;

/** Gap between + button and text field row — keep in sync with prompt-input.tsx. */
export const COMPOSER_ROW_GAP = 10;

/**
 * Left gutter for floating composer UI (relative to the `px-3` stack): attachment
 * chips, @ mention menu, etc. Aligns with the text field after the + button.
 */
export const COMPOSER_FLOATING_LEFT_INSET_PX =
  COMPOSER_GLASS_PADDING + COMPOSER_ACTION_SIZE + COMPOSER_ROW_GAP;

/** @deprecated Use COMPOSER_FLOATING_LEFT_INSET_PX. */
export const COMPOSER_ATTACHMENT_INSET_PX = COMPOSER_FLOATING_LEFT_INSET_PX;

/** `contentContainerStyle` for horizontal attachment rows (images + files). */
export const COMPOSER_FLOATING_SCROLL_CONTENT_INSET = {
  paddingLeft: COMPOSER_FLOATING_LEFT_INSET_PX,
} as const;

/** Matches `PromptInputBody` pill radius. */
export const COMPOSER_FLOATING_PILL_RADIUS = 22;

export const COMPOSER_FLOATING_PILL_STYLE = {
  borderRadius: COMPOSER_FLOATING_PILL_RADIUS,
  borderCurve: "continuous",
  overflow: "hidden",
} as const;

/** Solid fallback / inset: white (light) or elevated card (dark). */
export const COMPOSER_FLOATING_SOLID_CLASS =
  "border border-border/50 shadow-composer";

/** Inset panel inside the composer glass container. */
export const COMPOSER_FLOATING_INSET_CLASS =
  "bg-card border border-border/40";

/** @deprecated Use pill surface tokens; kept for image thumbs and legacy chips. */
export const COMPOSER_FLOATING_SURFACE_CLASS =
  "border border-border/50 bg-card shadow-composer";

/** @deprecated Prefer COMPOSER_FLOATING_PILL_RADIUS via pill style. */
export const COMPOSER_FLOATING_ROUNDED_CLASS = "rounded-[22px] overflow-hidden";

export const COMPOSER_FLOATING_SURFACE_STYLE = {
  borderCurve: "continuous",
} as const;
