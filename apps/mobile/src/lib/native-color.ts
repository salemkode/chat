import { formatHex, formatHex8, parse } from "culori/require";

/** Convert OKLCH/CSS/RGB colors to hex strings that RN processColor accepts. */
export function toNativeColorString(
  value: string | number | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    const a = (value >>> 24) & 0xff;
    const r = (value >> 16) & 0xff;
    const g = (value >> 8) & 0xff;
    const b = value & 0xff;
    if (a < 255) {
      return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
    }
    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  }
  const parsed = parse(value);
  if (!parsed) {
    return undefined;
  }
  if (parsed.alpha !== undefined && parsed.alpha < 1) {
    return formatHex8(parsed);
  }
  return formatHex(parsed);
}
