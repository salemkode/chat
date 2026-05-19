# Chat Template

https://github.com/user-attachments/assets/864ca10c-be94-4c45-8e98-a71bff7a0042

A high-performance AI chatbot template built with [Expo](https://expo.dev) and [Expo Router](https://docs.expo.dev/router/introduction/). Ships with iOS 26 Liquid Glass support, a responsive web UI, and runs on iOS, Android, and web from a single codebase.

## Features

- **Liquid Glass** -- glassmorphic prompt composer, navigation bars, and toolbar buttons on iOS 26 via `expo-glass-effect`
- **Web-first sidebar** -- collapsible sidebar with Radix context menus, dropdown menus, and tooltips for a desktop-grade web experience
- **Streaming messages** with throttled ~30fps updates, markdown rendering (code blocks, tables, inline formatting), and shimmer loading states
- **Platform-adaptive layouts** -- native gesture-driven drawer on iOS/Android, sidebar + inset content panel on web
- **Dark mode** -- automatic light/dark theme using OKLCH design tokens in Tailwind CSS v4
- **Native UI controls** -- SwiftUI model picker menu, toolbar buttons, and haptic feedback on iOS
- **Keyboard-aware** -- prompt input stays above the keyboard with `react-native-keyboard-controller`
- **Virtualized chat** -- performant scrolling with `@legendapp/list` and Reanimated-powered scroll-to-bottom button

## Tech Stack

| Layer      | Technology                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Framework  | Expo SDK 55, React Native 0.83, React 19                                                                                |
| Navigation | Expo Router (file-based) with typed routes, [Legend List](https://legendapp.com/open-source/list/) for virtualized chat |
| Styling    | Tailwind CSS v4 via [Uniwind](https://uniwind.dev/) + `tailwind-merge`                                                  |
| Native UI  | `@expo/ui` (SwiftUI), `expo-symbols`, `expo-haptics`, `expo-glass-effect`                                               |
| Web UI     | Radix UI (context menu, dropdown menu, tooltips), Lucide icons                                                          |
| Markdown   | Custom AST renderer with `mdast-util-from-markdown` + `react-syntax-highlighter`                                        |
| Animations | `react-native-reanimated`, `react-native-gesture-handler`                                                               |

## Getting Started

### Environment Variables

For day-to-day local work, prefer pulling variables from EAS instead of copying files between checkouts:

```bash
eas env:pull --environment development --path apps/mobile/.env.local
```

For production build validation, pull the production environment:

```bash
eas env:pull --environment production --path apps/mobile/.env.local
```

You can still create a local `.env` file manually when needed, but the EAS environment is the source of truth for cloud builds.

| Variable              | Description                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key used for the dedicated Google sign-in flow. |
| `EXPO_PUBLIC_CONVEX_URL` | Convex deployment URL used by the mobile client. |

### Install & Run

```bash
# From the repository root (installs the whole workspace)
pnpm install

# Metro / Expo dev server
pnpm run mobile:dev

# Or from apps/mobile after install:
pnpm start

# Platform targets — from repo root (`ios` / `android`), or web from the app folder
pnpm run ios
pnpm run android
cd apps/mobile && pnpm run web
```

> Requires Node.js 20+, pnpm (`corepack enable` recommended), and the [Expo CLI](https://docs.expo.dev/get-started/installation/). For iOS, you'll need Xcode and a simulator or device.

### Production Builds

Cloud builds:

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

Local debugging builds:

```bash
eas build --platform android --profile production --local
eas build --platform ios --profile production --local
```

The repo is set up so cloud builds are the standard release path. Local builds are mainly for debugging native issues on a developer machine.

## Customization

### Theme

Edit `global.css` to change the design tokens. Colors use OKLCH for perceptual uniformity across light and dark modes. The `@theme` block maps CSS variables to Tailwind classes:

```css
--app-background  ->  bg-background
--app-foreground  ->  text-foreground
--app-muted       ->  bg-muted
--app-border      ->  border-border
/* etc. */
```

### Chat Backend

The template ships with mock streaming responses in `app/index.tsx`. Replace `mockStreamResponse` with your API integration -- the streaming architecture (`createStreamingStore` + throttled token callback) is ready for real LLM APIs.

### Database

I recommend using Convex, which you can setup in a single command:

```
npx eas-cli@latest integrations:convex:connect
```

This app uses Clerk for authentication with a dedicated sign-in screen and Google login. Native Google sign-in requires a native build, not Expo Go. Convex also has support for Expo Notifications: [Learn more](https://www.convex.dev/components/push-notifications).

## License

This template was made for https://agent.expo.dev and is made freely available under the MIT license.
