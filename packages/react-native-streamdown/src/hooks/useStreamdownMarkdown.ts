import { useEffect, useRef, useState } from 'react';
import type { RemendOptions } from 'remend';
import { processStreamingMarkdown } from '../markdownProcessor';

interface UseStreamdownMarkdownOptions {
  remendConfig?: RemendOptions;
}

interface UseStreamdownMarkdownResult {
  processedMarkdown: string;
  isStreaming: boolean;
}

export function useStreamdownMarkdown(
  markdown: string,
  options?: UseStreamdownMarkdownOptions
): UseStreamdownMarkdownResult {
  const [processedMarkdown, setProcessedMarkdown] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const versionRef = useRef(0);

  useEffect(() => {
    if (markdown === '') {
      setProcessedMarkdown('');
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    const currentVersion = ++versionRef.current;
    const processed = processStreamingMarkdown(markdown, options?.remendConfig);

    if (currentVersion === versionRef.current) {
      setProcessedMarkdown(processed);
      setIsStreaming(false);
    }
  }, [markdown, options?.remendConfig]);

  return { processedMarkdown, isStreaming };
}
