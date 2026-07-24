# CI and local checks

> Decision record for the check gates and conventions. Current state and roadmap
> only, no history. `CLAUDE.md` holds the gotcha-level detail.

## Checks that must pass

```bash
cd api      && cargo +1.88 fmt && cargo +1.88 clippy --all-targets && cargo +1.88 test
cd frontend && npm run check && npm run build
```

CI (`.github/workflows/ci.yml`) runs these as independent jobs, with no
fail-fast, on every PR and on `main` and `develop`. A separate Source hygiene job
runs `scripts/check-control-chars.py`, which fails the PR if any tracked text file
(binary assets and the vendored `.yarn/` bundle excluded) contains a NUL byte or a
control character other than tab, newline, or carriage return. A "Migrate
(throwaway Postgres)" job applies the embedded migration set against a disposable
Postgres, so a broken or duplicate migration fails the PR rather than only a real
deploy.

## Conventions today

- **Version pinning everywhere.** Never rely on a floating `latest`. The Rust
  toolchain is pinned to 1.88 (`api/rust-toolchain.toml`); always use `cargo
  +1.88`. Node, Postgres, and the workspace image's baked tools are pinned to
  exact versions so local, CI, and production do not drift.
- **`api/build.rs`** emits `cargo:rerun-if-changed=migrations`, so adding a
  migration rebuilds the embedded set instead of silently testing a stale list.
- **sqlx uses runtime queries** (`query_as::<_, T>`), not the compile-time macros,
  so the crate builds without a live database. Keep it that way.
- **Search with `rg`, not `grep`.** The agent shell's `grep` is backed by ripgrep
  with `-I` and `--ignore-files`, so it silently skips files it deems binary or
  that are gitignored. Prefer `rg` for code search.
- **No em dashes** in any user-facing text, including commits and PR bodies.
- **No co-author trailer** on commits, and no self-assigned PR credit.

## Where it lives

- `.github/workflows/ci.yml`: the CI jobs.
- `scripts/check-control-chars.py`: the source-hygiene gate.
- `api/rust-toolchain.toml`: the pinned Rust toolchain.
- `api/build.rs`: the migration rebuild trigger.
