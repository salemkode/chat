/**
 * Capability slugs stored on Convex `models.capabilities` (comma-separated in admin UI).
 * Use lowercase kebab or single words for consistency.
 */
export const MODEL_CAPABILITY_META: Record<
  string,
  { label: string; tone: 'default' | 'violet' | 'amber' | 'sky' }
> = {
  'fine-tune': { label: 'Fine-tuning', tone: 'violet' },
  finetune: { label: 'Fine-tuning', tone: 'violet' },
  'fine-tuning': { label: 'Fine-tuning', tone: 'violet' },
  vision: { label: 'Vision', tone: 'sky' },
  reasoning: { label: 'Reasoning', tone: 'default' },
  code: { label: 'Code', tone: 'default' },
  tools: { label: 'Tools', tone: 'default' },
  audio: { label: 'Audio', tone: 'amber' },
  image: { label: 'Image', tone: 'sky' },
  embedding: { label: 'Embeddings', tone: 'default' },
}

const toneClass: Record<
  (typeof MODEL_CAPABILITY_META)[string]['tone'],
  string
> = {
  default: 'bg-muted text-muted-foreground border-border/60',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
  amber: 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/20',
  sky: 'bg-sky-500/10 text-sky-800 dark:text-sky-200 border-sky-500/20',
}

export function resolveCapabilityPresentation(slug: string) {
  const normalized = slug.trim().toLowerCase()
  const meta = MODEL_CAPABILITY_META[normalized]
  if (meta) {
    return { label: meta.label, className: toneClass[meta.tone] }
  }
  return {
    label: slug.trim(),
    className: toneClass.default,
  }
}
