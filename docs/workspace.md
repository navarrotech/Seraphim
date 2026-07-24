# Workspace (the agent sandbox)

> Decision record for the agent runtime. Current state and roadmap only, no
> history. `CLAUDE.md` holds the build-arg and path detail.

The `workspace` service is a long-lived, powerful but dumb sandbox. The API
drives it with `docker exec` (bollard). Claude is always spawned at `/workspace`
as the non-root `codespace` user.

## Decisions today

- **Flat clones.** Every enabled repo is cloned at `/workspace/{repo-name}`, so
  cross-repo work is natural. A task names a focus repo and branch. Adding or
  enabling a repo clones it into the workspace in the background so it lands
  without waiting for a full provision; removing one drains between tasks. The
  removal queue is in-memory, so provisioning also reconciles orphaned clone dirs
  (issue #380): it removes any flat git-clone dir under `/workspace` not backed by
  an enabled repo for that railway, never touching `.claude`, and fails closed on
  an empty desired set so a transient empty read never mass-deletes.
- **Instructions become files.** Global instructions write to
  `/workspace/AGENTS.md`, per-repo instructions to `/workspace/{repo}/CLAUDE.md`.
  A repo that commits its own `CLAUDE.md` is never clobbered (issue #385):
  provisioning writes or clears that path only for repos that do not track one, so
  it can no longer delete a repo's committed `CLAUDE.md` between tasks.
- **Config repo for `~/.claude`.** The agent's `~/.claude` comes from cloning
  `settings.config_repo_url` into `CLAUDE_CONFIG_DIR=/workspace/.claude`, not a
  host mount. This is a dedicated, hard-failing step: on failure it records
  `settings.config_repo_error`, raises a board banner, and halts the agent until
  it succeeds. A blank config repo URL bypasses the halt.
- **Two-tier setup.** Environment setup (`settings.base_setup_script`) runs once
  per provision or recreate; per-repo setup (`repositories.setup_script`) runs
  after each clone. A repo can opt into `setup_script_always_run` to re-run its
  setup before every task on the persistent clone.
- **Auth.** `CLAUDE_CODE_OAUTH_TOKEN` (or an API key) for Claude, the mounted host
  `~/.ssh` for `git@` clones, and `GH_TOKEN` for HTTPS plus octocrab. The
  entrypoint writes a system-wide git identity from `GIT_USER_NAME` and
  `GIT_USER_EMAIL` so commits work in every clone.
- **Baked tooling.** The image preinstalls the pinned Rust toolchains, Postgres 17
  plus `pg-ephemeral` for local migration checks (use `pg-ephemeral --fresh` for a
  clean database to apply the whole chain from `0001`, issue #386), and Playwright's
  Chromium, so a fresh workspace has no first-run download stall.
- **Safe infra validation (issue #383).** The workspace mounts the host Docker
  socket, whose daemon runs the operator's live `seraphim` stack, so a bare
  `docker compose up` from the agent's checkout targets the same project and
  `seraphim-*` container names and can clobber the running stack. `docker-sandbox`
  boots a privileged, throwaway `docker:dind` sidecar on that host daemon and
  prints a `DOCKER_HOST` the agent exports (`export DOCKER_HOST="$(docker-sandbox)"`),
  so `docker` / `docker compose` then run against that separate, empty daemon and
  cannot reach the live stack. The sidecar takes a unique random name every boot,
  is reachable only by this workspace over a dedicated throwaway network (never by
  the live containers), and is torn down by `docker-sandbox stop`; its teardown is
  label-scoped and hard-refuses any `seraphim`-named target, so it can never remove
  a live-stack resource. Image and build validation is complete; a host-source bind
  mount resolves against the sidecar's own filesystem, the usual Docker-in-Docker
  trait, so validate those with `docker compose build` / `config`. This is
  defence for validation and does not replace the network-isolation work in #396.
- **Two MCPs, at user scope.** The Playwright MCP is the agent's eyes for visual
  self-review, and the Seraphim MCP lets the agent edit its own setup scripts
  (recorded in `setup_script_changes`). Both are registered at user scope so
  `claude -p --permission-mode bypassPermissions` loads them with no approval
  gate.
- **Disk guard (issue #390).** `/workspace` is one volume shared across every
  sibling repo, so a Rust-heavy repo whose incremental `target/` balloons over
  many rebuilds can fill it and starve every other task, surfacing as a misleading
  `No space left on device` link error. Before each turn the agent loop guards it
  (`orchestrator::disk::guard_workspace_disk`): it prunes every repo's stale Rust
  `target/` dir when free space dips below a reclaim threshold (a `cargo clean`,
  since a clean rebuild is only a few GB), and refuses the turn with a loud
  "workspace disk full" heart-attack incident when even that leaves too little, so
  a disk problem reads as itself rather than a code failure.

## Where it lives

- `workspace/Dockerfile` and `workspace/entrypoint.sh`: the image and its setup.
- `workspace/seraphim-mcp/`: the hand-rolled zero-dep Seraphim MCP.
- `api/src/claude/exec.rs`: the `docker exec` turn runner.
- `api/src/docker/`: the `Workspace` handle (exec, restart, recreate) over bollard.
- `api/src/orchestrator/provision.rs`: provisioning and setup.
- See [frontend.md](./frontend.md) for the visual self-review loop the Playwright
  MCP serves.
