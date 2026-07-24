# Railways (planned)

> Decision record for parallel agent lanes. This is a roadmap: the design is
> locked but not yet built. `CLAUDE.md` holds the full scoping detail. Tracked by
> the Railways GitHub milestone.

A railway is a named parallel agent lane with its own workspace container, agent
loop, Claude session, and repo set. A repo belongs to exactly one railway for
work, so a task's railway always follows its repo. An undeletable `main` railway
holds everything by default.

## Locked design

- **Board.** Swimlanes: one board with each railway a horizontal lane across the
  columns. Moving a card to another railway is a repo-reassign action, not a drag.
- **Management UI.** A Settings subpage (`/settings/railways`) owns lane
  create, rename, and describe, the per-railway pause and the global master pause,
  start and stop, delete-with-confirm, the idle-stop timeout, and the per-repo
  lane assignment.
- **Loops.** One agent loop per railway, running in parallel; sync, review, and
  the defibrillator stay single global loops that are railway-aware.
- **Container lifecycle.** Lazy start on first work, then auto idle-stop (stopped,
  not removed, so restart is fast and keeps the clones and session).
- **Per-railway vs global.** Per-railway: session, pause, name, description, repo
  set, and lifecycle state. Global: model, setup scripts, config repo,
  instructions, tokens, one schedule, branch template, review policy, and the
  operator notepad on the board.
- **Deletion.** `main` is undeletable; deleting another railway reassigns its
  repos and their non-active tasks to `main`, then tears down its container and
  session. Blocked while a live turn runs on it.
- **Stats and pause.** The subscription usage gauge stays global with an aggregate
  rollup, while context, cost, tokens, and time are per-railway on each swimlane.
  A global master pause and a per-railway pause both gate work; one global
  schedule covers all railways.
- **Migration.** The existing setup becomes the `main` railway, its session
  becomes main's session, and all existing repos and tasks move to `main`.

The route planner (assign each drafted issue to a railway and order them) is part
of the milestone. The Conductor automated-ops agent is out of scope for now.
