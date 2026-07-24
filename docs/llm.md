# LLM credentials and providers

> Decision record for how the agent authenticates to and rotates between models.
> Current state and roadmap only, no history. `CLAUDE.md` holds the detail.

## Decisions today

- **Multiple credentials with priority rotation.** Claude auth is a
  priority-ordered set of credentials managed on Settings -> LLMs, stored in
  `llm_credentials`. Each row is a `kind` (subscription OAuth, a long-lived setup
  token, or an Anthropic API key), a label, a fractional position (lower runs
  first), an enabled flag, the secret, optional refreshing OAuth material, an
  `exhausted_until` rotation timer, and a provider plus base URL. The agent runs
  on the highest-priority available credential and refreshes its OAuth token ahead
  of expiry. The API never returns raw secrets, only a masked view (see
  [secrets.md](./secrets.md)).
- **Usage-limit rotation and auto-pause.** On a Claude `rate_limit_event` that
  crosses the configured threshold, the active credential is marked
  `exhausted_until` its reset and the agent rotates to the next credential. Only
  when every credential is exhausted does it set `settings.usage_paused_until` to
  the soonest reset and hold all new work until then, clearing automatically at
  reset. Escape hatches: a "Resume now" button clears the pause immediately, and a
  settings change re-derives the pause from current credential availability (the
  reevaluate delegates to the same reconcile the rotation path uses, so both share
  one source of truth), lifting it once a credential frees rather than off a stale
  usage event.
- **The board reflects the active credential.** The board header shows the active
  credential's email or label, and the usage gauge polls the active subscription
  credential when its consent granted `user:profile`.

## LiteLLM sidecar

The `litellm` service is an opt-in, lightweight LiteLLM proxy (the `llm` compose
profile) that translates other providers' message shapes to and from the
Anthropic Messages API the Claude Code CLI speaks. It runs proxy-only: no
database, no admin UI, no telemetry, reachable in-cluster at
`http://litellm:4000` and not exposed on a host port. Model routes live in
`litellm/config.yaml`; provider keys come from `.env`.

## Roadmap

Pointing the agent's `claude` exec at the proxy
(`ANTHROPIC_BASE_URL=http://litellm:4000`) to run on a non-Anthropic model is
future work. A credential already carries a provider and base URL for this; the
sidecar is the translation layer it will build on.

## Where it lives

- `api/src/orchestrator/credentials.rs`: the rotation core.
- `api/src/orchestrator/usage.rs`: the pause and resume decisions.
- `api/src/http/credentials.rs`: the credential endpoints.
- `litellm/config.yaml` and `litellm/README.md`: the proxy configuration.
