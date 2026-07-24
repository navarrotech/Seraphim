# Jira source

> Decision record for the Jira issue source. Current state and roadmap only, no
> history. `CLAUDE.md` holds the endpoint-level detail.

Jira is a first-class issue source alongside GitHub. `api/src/jira/` is a
dual-mode client (Cloud and Server or Data Center); the connection config and a
secret token live on the settings row (see [secrets.md](./secrets.md)).

## Decisions today

- **Boards and sync.** Followed `jira_boards` each carry a status-to-column map
  and a repo set. Board auto-discovery seeds them, and tickets sync into `tasks`.
- **Worked like a GitHub issue.** A Jira ticket inherits its board's repo set as
  default target repos (operator-overridable on the card, never clobbered by a
  later sync), the agent pulls it from To Do, the prompt renders the key, summary,
  description, and link, and the same branch, PR, review-gate, and merge flow runs
  (one PR per target repo, all-merge-to-Done). A repo-less ticket stays on the
  board and is skipped until a repo is assigned; the card and task view both flag
  that with an amber warning so the skip is never silent.
- **Two-way sync.** On PR open and on Done the agent posts a comment back to the
  Jira issue with the PR links and outcome, and moving the card to Done transitions
  the ticket through the board's column-to-status map. The task page renders the
  Jira discussion into the same thread shape GitHub and internal tickets use, and
  a reply posts back to Jira. The thread shows the workflow status verbatim, since
  Jira has no open-or-closed binary.
- **Attachments.** On first sync and again when worked, a ticket's Jira
  attachments are downloaded and stored so the agent sees its screenshots and
  logs with no manual fetch.

## Roadmap

Assignee write-back is not built yet.

## Where it lives

- `api/src/jira/`: the client, sync, and thread reading.
- `api/src/orchestrator/`: `transition_jira_to_column` and
  `capture_jira_attachments`.
- See [settings.md](./settings.md) for the Apps page where Jira is configured.
