/** Horizontal padding on the composer stack (`px-3`). */
export const COMPOSER_OUTER_HORIZONTAL_PADDING = 12;

/** Inner padding on the glass row that contains the + button. */
export const COMPOSER_GLASS_PADDING = 12;

/** Extra left inset so chips align with the + button inside the glass row. */
export const COMPOSER_CONTENT_INSET_CLASS = "pl-3";

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
