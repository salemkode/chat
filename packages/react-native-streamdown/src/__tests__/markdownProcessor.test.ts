import remend from 'remend';
import { describe, expect, it } from 'vitest';
import { processStreamingMarkdown } from '../markdownProcessor';

const cases = [
  'This is **bold',
  'This is _italic',
  'Run `pnpm test',
  'Read [the docs](https://example.com',
  'Remove ~~this',
  'Heading\n-',
  '- > 25',
];

describe('processStreamingMarkdown', () => {
  it.each(cases)('matches remend for %s', (markdown) => {
    expect(processStreamingMarkdown(markdown)).toBe(remend(markdown));
  });
});
