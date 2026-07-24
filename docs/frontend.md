# Frontend

> Decision record for the UI. Current state and roadmap only, no history.
> `CLAUDE.md` holds the component-level detail.

The frontend is SvelteKit (Svelte 5 runes) in SPA mode (`src/routes/+layout.ts`
sets `ssr = false`), served by adapter-node. `src/hooks.server.ts` proxies
`/api/*` to the API in production; `vite.config.ts` proxies it in dev.

## Decisions today

- **Structure.** `src/lib/api.ts` is a ky client with one function per endpoint,
  `src/lib/types.ts` holds the shared types, components live in
  `src/lib/components/`, and pages in `src/routes/`.
- **Key routes.** `/` (the kanban board), `/suggestions`, `/settings` and its
  subpages, `/task/<id>`, and `/watch` (a kiosk activity monitor). See
  [settings.md](./settings.md) for the Settings information architecture.
- **Checks.** `yarn check` (svelte-check), `yarn test` (vitest), and `yarn build`
  must pass. See [ci.md](./ci.md).

## Dev server and visual review

`cd frontend && yarn dev` runs Vite on `http://localhost:5173`, proxying `/api/*`
to the API on `localhost:27182`, so the API must be up. For a data-backed page
(repositories, board, task views), boot a throwaway backend with
`scripts/dev-api.sh up` first (see [self-update.md](./self-update.md) for the
script index).

Any UI change is reviewed in a real browser before it is called done: open the
affected route with the Playwright MCP and check layout with computed styles at
375px and 1280px, taking a screenshot only to confirm. UI work composes from the
repo's existing layout primitives and spacing tokens rather than hand-rolled
margins.

- **Component preview.** `/__components` is a dev-only gallery (guarded by `dev`
  from `$app/environment`, inert in production) that renders the floating and
  conditional components (the bulk action bars, the board banners) with stub
  props, so their review needs no seeded backend. Extend it when adding a new
  floating or conditional component.

## Where it lives

- `frontend/src/routes/`: the pages, including `+page.svelte` (the board) and
  `__components/+page.svelte` (the preview gallery).
- `frontend/src/lib/components/`: the shared components.
- `frontend/src/lib/settings/sections.ts`: the Settings section registry.
- `/usr/local/share/seraphim/visual-checks.md`: the computed-style check library
  baked into the workspace image.
