# Seraphim docs

Per-category decision records for Seraphim. Each file captures the decisions for
one area of the app: what it does today, where it lives in the code, and the
roadmap where there is one.

## The policy

`CLAUDE.md` at the repo root is the project memory agents read first, and it
stays the authoritative summary of every decision. These docs expand each
category for anyone browsing the repo and point at the code that implements it.
When a decision changes, update `CLAUDE.md` and the matching doc here in the same
change.

Two rules carry over from `CLAUDE.md`:

- **Current state and future plans only, no history.** Write "today the system
  does X" and "the roadmap is Y". Do not write "we used to do X" or "we migrated
  from Y". A reversed decision is rewritten in place, not annotated.
- **No em dashes** in this prose. Use a comma, a colon, or two sentences.

Each doc keeps a uniform shape: a short intro, "Decisions today", an optional
"Roadmap", and "Where it lives" pointers into the code.

## Index

| Doc | Covers |
|---|---|
| [architecture.md](./architecture.md) | The Compose services, control flow, ports, and repo layout. |
| [data-model.md](./data-model.md) | The Postgres tables and what each holds. |
| [orchestrator.md](./orchestrator.md) | The sync, agent, review, and defibrillator loops. |
| [workspace.md](./workspace.md) | The agent sandbox: provisioning, setup scripts, baked tooling, the MCPs. |
| [frontend.md](./frontend.md) | The SvelteKit SPA, dev server, routes, and visual self-review. |
| [settings.md](./settings.md) | The Settings information architecture and the `settings` row. |
| [secrets.md](./secrets.md) | How tokens, environment variables, and blobs are stored and masked. |
| [llm.md](./llm.md) | Claude credential rotation, usage-limit pause, and the LiteLLM sidecar. |
| [self-update.md](./self-update.md) | The in-app updater and the host update scripts. |
| [jira.md](./jira.md) | The Jira issue source. |
| [automation.md](./automation.md) | Board automation rules. |
| [ci.md](./ci.md) | Local checks, the CI jobs, source hygiene, and version pinning. |
| [railways.md](./railways.md) | The planned parallel-agent lanes (roadmap). |

## Adding a category

When a decision does not fit an existing file, add a new `docs/<category>.md`
that follows the shape above, then link it in the index. Keep each file to the
decisions for its category; the dense cross-cutting detail stays in `CLAUDE.md`
and the code.
