# Settings

> Decision record for configuration and the Settings UI. Current state and
> roadmap only, no history. `CLAUDE.md` holds the field-level detail.

## Information architecture

`/settings` is a Stripe-style landing grid that links to one dedicated page per
category at `/settings/[section]`. The grid and every page header are driven by a
single registry (`src/lib/settings/sections.ts`, `SETTINGS_GROUPS` plus
`SECTION_BY_ID`), which groups every section under at most three headings sized to
fit a 1920x1080 screen without scrolling:

- **Agent:** general, LLMs, workspace, availability, usage.
- **Workflow and integrations:** automation, railways, apps, secrets,
  notifications.
- **System:** updates, backup, danger.

The dynamic page renders the section matching the route param, fetches only that
section's data, and falls back to "Not found" for an unknown id.

Decisions folded into this layout: Automation and Railways moved off the top nav
into settings, and `/automation` and `/railways` redirect to their `/settings/*`
homes. Jira and Tailscale are opt-in integrations under a single Apps page, not
native settings. The Workspace page groups the agent instructions, the base setup
script, the config repo, environment variables, network access, and container
restart or recreate. Hard reset lives in a single Danger zone. Usage and stats
merges the usage-pause controls with the statistics reset. There is no settings
notepad: the global operator notepad lives on the kanban board.

## The `settings` row

Configuration is one row (`id = 1`) holding the org profile, `global_instructions`,
`default_review_policy`, `agent_paused`, `claude_model`, `base_setup_script`,
`config_repo_url`, `default_branch_template`, and `current_session_id` (the one
shared Claude session). It also holds the usage-pause columns (see
[llm.md](./llm.md)), the availability schedule (weekly windows and skip dates in
the operator's time zone, which gate when the agent pulls new work), the
notification-sound preferences, and the secret token columns (see
[secrets.md](./secrets.md)).

## Where it lives

- `frontend/src/routes/settings/+page.svelte`: the landing grid.
- `frontend/src/routes/settings/[section]/+page.svelte`: the dynamic page.
- `frontend/src/lib/settings/sections.ts`: the section registry.
- `api/src/http/settings.rs`: the settings endpoints.
