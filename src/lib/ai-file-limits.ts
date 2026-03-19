/** Target max lines per text/code unit when feeding context to the AI (split larger files). */
export const AI_CONTEXT_MAX_LINES = 600
export const AI_CONTEXT_MIN_LINES = 500
export const AI_CONTEXT_HARD_MAX_LINES = 700

export function countLinesInText(text: string): number {
  if (!text) {
    return 0
  }
  let lines = 1
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) {
      lines += 1
    }
  }
  return lines
}

export function textFileExceedsAiLineBudget(
  text: string,
  maxLines = AI_CONTEXT_HARD_MAX_LINES,
): boolean {
  return countLinesInText(text) > maxLines
}
