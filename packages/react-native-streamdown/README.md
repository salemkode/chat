# @0xbanky/react-native-streamdown

> Fork of [`react-native-streamdown`](https://github.com/software-mansion-labs/react-native-streamdown) with GitHub Flavored Markdown (GFM) support — tables, task lists, strikethrough, autolinks — via the `flavor` prop.
>
> This project is not affiliated with, endorsed by, or sponsored by Vercel.

A streaming-ready markdown component for React Native built on top of [`react-native-enriched-markdown`](https://github.com/software-mansion-labs/react-native-enriched-markdown) and [`remend`](https://www.npmjs.com/package/remend).

It repairs raw, incomplete markdown as it streams token-by-token from an LLM, then renders it with native markdown text.

## Features

- Renders incomplete streaming markdown correctly — no visual glitches mid-stream
- Inline LaTeX support (`$...$`) with streaming completion — applied automatically, no configuration needed (we've also opened a [PR to add this directly to remend](https://github.com/vercel/streamdown/pull/446))
- CommonMark rendering (headers, bold, italic, inline code, fenced code blocks, links, images) powered by `react-native-enriched-markdown` with built-in `streamingAnimation`
- Optional GitHub Flavored Markdown (GFM) — tables, task lists, strikethrough, autolinks — via `flavor="github"`
- Customizable via `remendConfig`

---

## Installation

```sh
yarn add @0xbanky/react-native-streamdown
```

### Peer dependencies

```sh
yarn add react-native-enriched-markdown remend
```

| Package                          | Version      |
| -------------------------------- | ------------ |
| `react-native-enriched-markdown` | `0.4.0`      |
| `remend`                         | `1.2.2`      |

---

## Usage

```tsx
import { StreamdownText } from '@0xbanky/react-native-streamdown';

// markdown can be updated token-by-token as the LLM streams
<StreamdownText markdown={partialMarkdown} />;
```

### Props

`StreamdownText` accepts all props from `EnrichedMarkdownText` plus one additional prop:

| Prop           | Type                         | Description                                                                                                                                 |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `flavor`       | `'commonmark'` \| `'github'` | Optional. Defaults to `'commonmark'`. Set to `'github'` to render GitHub Flavored Markdown — tables, task lists, strikethrough, autolinks.  |
| `remendConfig` | `RemendOptions`              | Optional. Override the default remend processing config. See [remend docs](https://www.npmjs.com/package/remend) for all available options. |

#### GFM example

```tsx
<StreamdownText markdown={partialMarkdown} flavor="github" />
```

Note: `streamingAnimation` (tail-fade) is recommended only with `flavor="commonmark"`; it's disabled automatically under `'github'` because that flavor uses a container-based renderer. You can still force it on by passing `streamingAnimation` explicitly.

---

## Example app

The `example/` directory in this repository contains a fully working demo app that shows:

- **Streaming Markdown Simulator** — streams a sample markdown document token-by-token to demonstrate rendering quality and the `streamingAnimation` effect
- **LLM Streaming Demo** — connects to the OpenAI Chat Completions API via SSE and renders the response live using `StreamdownText`

It is a practical reference for wiring `StreamdownText` into a real streaming UI.

---

## Fork notes

This fork adds GFM rendering by exposing the upstream library's `flavor` prop. Tables, task lists, strikethrough, and autolinks render natively when `flavor="github"`. `streamingAnimation` is scoped to `commonmark` because the GFM renderer is container-based.

---

Built by [Software Mansion](https://swmansion.com/).

[<img width="128" height="69" alt="Software Mansion Logo" src="https://github.com/user-attachments/assets/f0e18471-a7aa-4e80-86ac-87686a86fe56" />](https://swmansion.com/)

---

## License

MIT
