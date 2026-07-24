# Instructions for the API (`api/`)

The Rust orchestrator brain (axum + sqlx + tokio). The frontend and workspace are
sibling directories; this file covers backend work done in `api/`. See the root
`CLAUDE.md` for the whole-stack picture.

## Database safety (issue #396)

**Never touch the production database.** The `seraphim-postgres` container is the
LIVE database the running API owns. Do not connect to it, run migrations against
it, or point tests at it, and do not reverse-engineer its address or credentials
(for example via `docker inspect` or `docker exec`) to reach it. A stray migration
run against it once dropped a column the running API binary still queried and took
the API down. Isolating Postgres on its own Docker network keeps the workspace from
routing to it, but treat this rule as absolute regardless.

**For any DB-gated test or migration check, use the throwaway PostgreSQL baked into
the workspace image**, which never touches production:

```sh
export DATABASE_URL="$(pg-ephemeral)"          # throwaway PG17 on 127.0.0.1
export DATABASE_URL="$(pg-ephemeral --fresh)"  # a clean, empty DB to apply the whole chain from 0001
```

If you genuinely need the real database's state, ask with `seraphim-ask` rather than
connecting to it.

## Build and test

- The toolchain is pinned to **1.88** (`api/rust-toolchain.toml`); always use
  `cargo +1.88`.
- **sqlx uses runtime queries** (`query_as::<_, T>`), not the compile-time macros,
  so the crate builds and clippy runs **without a live database**. `cargo +1.88 build`,
  `clippy`, and the plain unit tests need no DB at all; only the DB-gated integration
  tests do, and those read `DATABASE_URL`, which you point at `pg-ephemeral` (above).

## Migrations

- Migrations live in `api/migrations/NNNN_*.sql`, applied by `sqlx::migrate!` at API
  boot (`src/db/mod.rs`) and by the one-shot `src/bin/migrate.rs`. Keep them linear
  and forward-only.
- A migration that drops or renames a column the running binary still queries breaks
  production the moment the schema and the binary disagree (issue #396). Pair a schema
  change with the code change that stops using the old shape, and land them together.
