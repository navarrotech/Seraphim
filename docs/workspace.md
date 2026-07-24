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
- **Two MCPs, at user scope.** The Playwright MCP is the agent's eyes for visual
  self-review, and the Seraphim MCP lets the agent edit its own setup scripts
  (recorded in `setup_script_changes`). Both are registered at user scope so
  `claude -p --permission-mode bypassPermissions` loads them with no approval
  gate.

## Where it lives

- `workspace/Dockerfile` and `workspace/entrypoint.sh`: the image and its setup.
- `workspace/seraphim-mcp/`: the hand-rolled zero-dep Seraphim MCP.
- `api/src/claude/exec.rs`: the `docker exec` turn runner.
- `api/src/docker/`: the `Workspace` handle (exec, restart, recreate) over bollard.
- `api/src/orchestrator/provision.rs`: provisioning and setup.
- See [frontend.md](./frontend.md) for the visual self-review loop the Playwright
  MCP serves.
