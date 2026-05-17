import remend from 'remend';
import type { RemendOptions } from 'remend';

export function processStreamingMarkdown(
  markdown: string,
  config?: RemendOptions
): string {
  return remend(markdown, config);
}
