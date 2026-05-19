import { EnrichedMarkdownText } from 'react-native-enriched-markdown';
import { useStreamdownMarkdown } from './hooks/useStreamdownMarkdown';
import type { StreamdownTextProps } from './types';

/**
 * Streaming-ready markdown component.
 *
 * Repairs incomplete markdown with remend, then renders via EnrichedMarkdownText.
 */
export function StreamdownText({
  markdown,
  remendConfig,
  selectable = true,
  flavor = 'commonmark',
  streamingAnimation,
  ...enrichedMarkdownProps
}: StreamdownTextProps) {
  const { processedMarkdown, isStreaming } = useStreamdownMarkdown(markdown, {
    remendConfig,
  });

  return (
    <EnrichedMarkdownText
      flavor={flavor}
      markdown={processedMarkdown}
      streamingAnimation={streamingAnimation ?? flavor === 'commonmark'}
      selectable={!isStreaming && selectable}
      {...enrichedMarkdownProps}
    />
  );
}
