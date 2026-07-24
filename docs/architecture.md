# Architecture

> Decision record for the overall system shape. Current state and roadmap only,
> no history. `CLAUDE.md` holds the authoritative summary.

Seraphim is a self-hosted autonomous developer agent. It runs on one machine,
watches an issue board (GitHub and Jira), and works tickets like a developer:
picks up the next issue, writes code in a persistent Docker workspace, opens a
pull request, and follows per-repo review rules. A human curates and orders the
work on a kanban board. The core idea is a long-lived, single-threaded Claude
Code session that carries context from issue to issue.

## Decisions today

- **Backend:** Rust (Axum, tokio, sqlx, bollard, octocrab, eyre, mimalloc). The
  `api` service is the only orchestrator: issue sync, the agent loop, REST plus
  SSE, and Docker control.
- **Frontend:** SvelteKit (Svelte 5 runes) in SPA mode, with a
  `svelte-dnd-action` kanban board.
- **Database:** Postgres 17, holding the board, the issue cache, the conversation
  log, and all configuration.
- **Orchestration:** Docker Compose is the primary deployment method. Five
  services run by default: `postgres`, `api`, `frontend`, `workspace`, and
  `tailscale`. A sixth, `litellm`, is opt-in under the `llm` profile (see
  [llm.md](./llm.md)).
- **Exposure:** a Tailscale sidecar (`tailscale serve`) publishes the UI over the
  tailnet with HTTPS. A blank `TS_AUTHKEY` idles the sidecar instead of
  crash-looping it, and the Settings Tailscale panel then reads "disabled".
- **Hosts:** Windows 11 and Linux only; every service is a Linux container. There
  is no macOS support.
- **Ports:** the API is `27182` and the UI is `31415`, host and internal. These
  are deliberately non-standard. There should be no `8080` or `3000` anywhere.

## Control flow

The `api` is the brain and the `workspace` is a powerful but dumb sandbox. The
API reaches into the workspace with `docker exec` (bollard) over the mounted host
Docker socket. Issue sync and PR merge run deterministically from Rust
(octocrab); the agent itself runs `git` and `gh` inside the workspace.

A poll or a webhook upserts GitHub and Jira issues into Postgres, the board
streams to the UI over SSE, the operator drags an issue into To Do, the
orchestrator pulls the top card and runs a Claude turn in the workspace, the API
detects the resulting PR, and the review policy moves the card to In Review or
Done.

## Where it lives

- `docker-compose.yml`: the service definitions.
- `api/src/main.rs`: boots the app (config, DB connect and migrate, workspace
  handle, GitHub client, spawn the loops, serve).
- `api/src/state.rs`: `AppState` (clone-cheap) plus the SSE broadcast bus.
- `api/src/http/`: one file per resource plus `sse.rs`, routed under `/api/v1`.
- `frontend/`: the SvelteKit UI (see [frontend.md](./frontend.md)).
- `workspace/`: the agent sandbox image (see [workspace.md](./workspace.md)).
- `tailscale/serve.json`: the tailnet serve config.

See [self-update.md](./self-update.md) for launch and update, and
[data-model.md](./data-model.md) for the schema.
