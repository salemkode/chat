/**
 * Arabic script ranges (primary blocks used for Arabic / Persian / Urdu, etc.).
 */
const ARABIC_SCRIPT_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** True when the text contains at least one Arabic-script code point. */
export function isArabic(text: string): boolean {
  return ARABIC_SCRIPT_RE.test(text);
}
