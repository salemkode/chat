# AGENTS.md

## Mobile Architecture Rules

Use skill: `mobile-chat-architecture` for mobile chat work.

Mandatory constraints:
- Build chat UI from reusable components, not page-local monoliths.
- Keep model dialog modules in `apps/mobile/src/components/dialog`.
- Keep message row layout shared for both user/assistant across new, existing, and custom chat contexts.
- Use Convex optimistic updates on mutations only; never on actions.
- Surface non-blocking inline errors when optimistic mutation calls fail.
