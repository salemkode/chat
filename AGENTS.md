# AGENTS.md

## Frontend / web UI

Use skill: `frontend-design` when building or significantly styling web components, pages, dashboards, marketing surfaces, or other browser UI where design quality and a non-generic aesthetic matter. Reconcile with existing Tailwind tokens and mobile architecture rules as described in that skill.

**Shadcn / UI kit**: When adding or regenerating primitives, align with [ui.shadcn.com/create](https://ui.shadcn.com/create) preset **`b2D0wqNxT`** (or run `npx shadcn@latest init --preset b2D0wqNxT` in a scratch project and port variables). Prefer existing theme tokens (`bg-card`, `border-border`, `text-muted-foreground`, etc.) over one-off chrome.

## Mobile Architecture Rules

Use skill: `mobile-chat-architecture` for mobile chat work.

Mandatory constraints:
- Build chat UI from reusable components, not page-local monoliths.
- Keep model dialog modules in `apps/mobile/src/components/dialog`.
- Keep message row layout shared for both user/assistant across new, existing, and custom chat contexts.
- Use Convex optimistic updates on mutations only; never on actions.
- Surface non-blocking inline errors when optimistic mutation calls fail.
