# Board automation

> Decision record for automation rules. Current state and roadmap only, no
> history. `CLAUDE.md` holds the operator and matcher detail.

Automation rules react to incoming issue events and reorder the board without a
human. Rules are managed on the Automation page (under Settings).

## Decisions today

- **Shape.** A rule has a source, a trigger (`created`, `updated`, or `comment`),
  a condition group (AND or OR of `{field, operator, values}` over labels,
  author, repo, title, body, comment, and state), and an action (move the card to
  the top or bottom of To Do). The rule shape and the matcher are pure and
  I/O-free, so they are unit-tested without a database.
- **Firing paths.** The webhook is the realtime path for every trigger. The poll
  sync is the reliable fallback for `created` rules: when an issue is first
  inserted, `created` automation fires exactly once on that first-insert
  transition, never re-firing as the issue is re-listed each poll. `updated` and
  `comment` triggers remain webhook-only, since poll-firing them needs change
  detection.
- **Source-agnostic, GitHub-wired.** Rules can target any source, but only GitHub
  events are wired so far.
- **No silent inertness.** When an enabled rule exists but no GitHub webhook
  secret is set, the Automation page shows a dismissible notice so a rule never
  sits silently inert.

## Where it lives

- `api/src/automation/`: the rule shape and the pure matcher (unit-tested).
- `api/src/orchestrator/`: `run_github_automation`, called from the webhook
  handler and the poll sync.
- `api/src/http/webhooks.rs`: the inbound webhook endpoints.
- See [data-model.md](./data-model.md) for `automation_rules`.
