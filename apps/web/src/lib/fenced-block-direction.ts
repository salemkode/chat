const letter = /\p{L}/u
const latinLetter = /\p{Script=Latin}/u
const hebrewLetter = /\p{Script=Hebrew}/u
const arabicLetter = /\p{Script=Arabic}/u

/**
 * Text direction for fenced markdown / code blocks.
 *
 * Returns `rtl` only when every letter in the content belongs to the Arabic script
 * (no Latin, Hebrew, or other alphabetic scripts). Digits, punctuation, whitespace,
 * and symbols are ignored for this decision.
 */
export function getFencedBlockDirection(text: string): 'ltr' | 'rtl' {
  if (text.length === 0 || !/\S/.test(text)) {
    return 'ltr'
  }

  let sawArabicLetter = false

  for (const ch of text) {
    if (!letter.test(ch)) {
      continue
    }
    if (latinLetter.test(ch) || hebrewLetter.test(ch)) {
      return 'ltr'
    }
    if (arabicLetter.test(ch)) {
      sawArabicLetter = true
      continue
    }
    return 'ltr'
  }

  return sawArabicLetter ? 'rtl' : 'ltr'
}
