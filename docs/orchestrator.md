# Orchestrator

> Decision record for the agent loops. Current state and roadmap only, no
> history. `CLAUDE.md` holds the step-by-step detail.

The `api` runs four loops. The agent loop is single-threaded and awaits each task
to completion before the next; sync, review, and the defibrillator run alongside
it.

## Loops today

- **sync**: polls every repo with `sync_issues` for open issues and upserts them
  to the top of Available, never clobbering human-set column or position. Inbound
  webhooks (`POST /api/v1/webhooks/{github,jira}`) apply the same upsert in
  realtime, authenticated by a per-provider shared secret. Sync also reflects
  external state changes onto the board (an issue closed outside Seraphim moves to
  Done, a reopened one back to Available) only on a genuine transition, and leaves
  a card the agent is mid-work on alone. A repo whose issue list fails records a
  per-repo `sync_error`, shows a dismissible banner, and never stops the others.
- **agent**: when not paused, the config repo is healthy, and inside the
  availability schedule, it picks work by priority: resume a task whose question
  was just answered, fix a PR with failing CI, resolve a merge conflict, address
  review comments, then pull the top of To Do, and finally revisit a PR it gave
  up on (cooldown-gated). A `blocking` task holds back new To Do work until its PR
  merges, while its own PR keeps advancing. A `Depends on:` marker stacks fresh
  work on an unmerged dependency's branch.
- **review**: gates each task on all of its pull requests (a task can span
  several repos, one PR each) and reaches Done only once they have all merged. The
  merge gate is exactly CI green and zero unresolved review threads and no
  outstanding "changes requested" review; approval alone never merges, and the
  review lookup fails closed. A PR GitHub cannot squash-merge (an empty net diff
  or a draft) is held in review, never merge-attempted. CI fixes and review
  addressing are each bounded by a three-attempt budget before parking for a
  human.
- **defibrillator**: recovers turns that die mid-flight (a "heart attack"),
  detected by an in-turn heartbeat, a loop-level error catch, and a background
  watchdog. It kills the orphaned process, records a `heart_attacks` incident, and
  revives the task (To Do if it had no PR, else In Review), bounded by three
  attempts before leaving it for a human. Each incident raises a dismissible board
  banner plus a notification.

## Where it lives

- `api/src/orchestrator/mod.rs`: the loops.
- `api/src/orchestrator/review.rs`: the pure, unit-tested merge decision.
- `api/src/orchestrator/prompt.rs`: the turn prompts.
- `api/src/git/`: PR detection, the CI-green check, and squash-merge (octocrab).
- See [data-model.md](./data-model.md) for `tasks`, `turns`, `events`, and
  `heart_attacks`.
