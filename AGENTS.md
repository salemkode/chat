# AGENTS.md

## Agent constraints

- Do **not** add or change lint/format configuration or rules (e.g. ESLint, Oxlint, Biome, Prettier, `*rc` / `*config` for those tools) unless the user explicitly asks.
- Do **not** use TypeScript `as` type assertions unless the user explicitly asks; prefer sound narrowing, `satisfies`, or refactors that preserve types without assertions.
- **Convex document IDs** (`Id<'tableName'>`): avoid scattering `as Id<...>` on arbitrary strings. Prefer:
  - **Server**: `ctx.db.normalizeId("tableName", string)` or `args: { id: v.id("tableName") }`.
  - **Client / shared**: `@chat/shared/logic/convex-ids` — `parseConvexIdForTable("tableName", value)` and `isPossiblyConvexDocumentId` (shape-only; still validate on the server for authoritative table + format checks). Centralize any remaining branding in those helpers instead of ad hoc casts.

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

## Documentation

When code or product behavior changes in ways readers would care about, update Markdown under `docs/`. Follow [docs/agent.md](./docs/agent.md).
