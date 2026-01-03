# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` React/Vite UI; `electron/` desktop shell build; `chrome/` extension; `vscode/` VS Code extension; `common/` shared TypeScript utilities; `legacy/` historical code kept for reference; `scripts/` release/testdrive helpers.
- Tests generally live beside sources as `*.spec.ts`/`*.test.ts` or under `__test__/`.
- Assets for packaged apps live in each workspace’s `public/` folder (e.g., `electron/public`).

## Build, Test, and Development Commands
- Install: `yarn install` at repo root (workspaces enabled). Node ≥22.16, Yarn ≥1.22 required; `tsx` should be available globally for tooling.
- Develop apps: `yarn --cwd frontend dev` (browser UI), `yarn --cwd electron dev` (desktop), `yarn --cwd chrome dev`, `yarn --cwd vscode dev`. The root `yarn dev` uses `concurrently` and may need path fixes; prefer workspace commands.
- Quality gates: `yarn lint`, `yarn typecheck`, `yarn test` (Vitest). Faster loop: `yarn test:dev`. Smoke bundle path: `yarn smoketest`.
- Build artifacts: `yarn build` (runs `scripts/build.sh`), package installers via `yarn compile:deb` or `yarn compile:rpm`. Cleanup: `yarn clean`; full reset: `yarn purge`.

## Coding Style & Naming Conventions
- TypeScript-first; React components use named exports (default exports blocked). Prefer camelCase for identifiers and PascalCase for components/types.
- ESLint extends Google/React rules: 2-space indent, single quotes, no semicolons, Stroustrup braces, max line length 120, `object-curly-spacing` and `array-bracket-spacing` enforced.
- Copyright header enforced: `Copyright Ac <year> Jalapeno Labs` at top of files.
- Keep imports ordered/grouped; avoid unused vars; prefer explicit returns and curly braces for all control blocks.

## Testing Guidelines
- Vitest with `happy-dom` drives unit and smoke tests. Place specs as `*.spec.ts`/`*.test.ts` near the code they cover.
- Use targeted assertions and stub external services; set `SMOKETEST=true yarn test` to mimic release surfaces.
- Add regression tests for bug fixes and new behaviors; keep coverage meaningful around hotkey flows, log parsing, and automation routines.

## Commit & Pull Request Guidelines
- Commit messages follow the existing style: short, present-tense imperatives (e.g., `Fix bad lint`, `Add hotkey cancel`). Keep them focused; no ticket prefixes observed.
- Run `yarn precommit` (or configure `.githooks/pre-commit`) before pushing; it runs lint, typecheck, tests, and build.
- PRs should summarize scope, link issues/tasks, and note impacts on Electron/Chrome/VS Code bundles. Include screenshots or recordings for UI-visible changes and list new commands/shortcuts. Document configuration tweaks and test coverage notes.
