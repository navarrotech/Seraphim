# Data model

> Decision record for the Postgres schema. Current state and roadmap only, no
> history. `CLAUDE.md` holds the full field-level detail; this is the map.

Migrations live in `api/migrations/` and are embedded at compile time
(`sqlx::migrate!`), then run on API boot. Queries are runtime sqlx
(`query_as::<_, T>`), so the crate builds without a live database. `board_column`
(the kanban lane: available, todo, in_progress, in_review, done, ignored) and
`status` (the operational sub-state) are intentionally separate columns.

## Tables today

- **`settings`**: one row (`id = 1`) with the org profile, global instructions,
  default review policy, the pause switch, the Claude model, the base setup
  script, the config repo URL, the shared Claude session id, the usage-pause
  columns, the availability schedule, and the notification-sound preferences.
  See [settings.md](./settings.md) and [secrets.md](./secrets.md).
- **`llm_credentials`**: the priority-ordered Claude credentials the agent
  rotates through. See [llm.md](./llm.md).
- **`environment_variables`**: user-defined key/value rows injected into the
  agent's execs, with secret values scrubbed from output. See
  [secrets.md](./secrets.md).
- **`repositories`**: a tracked repo, holding clone URL, default branch, per-repo
  setup script, instructions, review policy, the issue-sync toggle and label
  filter, and the last sync error. A repo with `sync_issues` is its own issue
  source.
- **`tasks`**: the board cards, holding source, external id, repo, title,
  column, fractional position, status, branch, PR URL, `hold`, and `blocking`.
- **`turns`** / **`events`**: per-task Claude invocations and the append-only
  parsed stream-json feed. The orchestrator also injects synthetic `ci` and
  `lifecycle` events into the same stream.
- **`environment_suggestions`**: agent recommendations about a task, of two
  kinds: environment setup tips and out-of-scope follow-up work.
- **`setup_script_changes`**: setup-script edits the agent made to itself
  through the Seraphim MCP, recorded with a before/after and a reason. See
  [workspace.md](./workspace.md).
- **`questions`**: decisions the agent escalated to the operator, answered in
  the task view. The pending list is derived live (issue #391): a question shows
  only while its task is still parked awaiting input, and re-queuing a card
  withdraws its pending questions, so parked work never strands an un-answerable
  question.
- **`task_screenshots`** / **`task_attachments`**: image and file blobs tied to
  a task, stored as `bytea` and streamed by a dedicated route, never inlined in
  board or task JSON. See [secrets.md](./secrets.md) for the at-rest caveat.
- **`heart_attacks`**: recorded turns that died mid-flight, written by the
  defibrillator loop. See [orchestrator.md](./orchestrator.md).
- **`automation_rules`**: user-defined board automation. See
  [automation.md](./automation.md).
- **`jira_boards`** and the Jira config on the settings row back the Jira source.
  See [jira.md](./jira.md).

## Where it lives

- `api/migrations/`: the SQL migrations.
- `api/src/db/models.rs`: the enums and `FromRow` structs.
- `api/src/db/queries.rs`: the runtime sqlx queries.
- `api/src/db/mod.rs`: the pool and the migrate call.
