# LiteLLM proxy sidecar

A lightweight [LiteLLM](https://docs.litellm.ai/) proxy that translates other
providers' message shapes into the Anthropic Messages API the Claude Code CLI
speaks. It is the groundwork (issue #342) for eventually running Seraphim's agent
on any LiteLLM-supported LLM (OpenAI, xAI Grok, Moonshot Kimi, and more).

## Lightweight by design

The full LiteLLM platform ships a database, an admin UI, and spend logging. This
sidecar runs the proxy **only**:

- **No database.** `DATABASE_URL` / `STORE_MODEL_IN_DB` are never set, so the
  proxy skips Prisma entirely and boots from `config.yaml` alone.
- **No admin UI.** `DISABLE_ADMIN_UI=True`.
- **No telemetry.** `litellm_settings.telemetry: false`.

## Opt-in

It is not wired into the agent yet and does not start by default. It only runs
under the `llm` compose profile:

```bash
docker compose --profile llm up -d litellm
```

In-cluster it is reachable at `http://litellm:4000`; it is not exposed on a host
port.

## Configure

- Routes live in [`config.yaml`](./config.yaml). Each entry maps a `model_name`
  (what a client requests) to a `<provider>/<model>` route. The listed models are
  examples; edit them for your accounts.
- API keys come from the environment (`.env`): `LITELLM_MASTER_KEY` (clients
  authenticate to the proxy with this), plus `OPENAI_API_KEY`, `XAI_API_KEY`,
  `MOONSHOT_API_KEY`. A route whose key is unset just fails at call time, so the
  proxy still starts with none configured.

## Eventual usage

LiteLLM exposes an Anthropic-compatible endpoint at `/v1/messages`. To drive the
agent through it later, point the Claude Code CLI at the proxy
(`ANTHROPIC_BASE_URL=http://litellm:4000`, auth = the master key) and request one
of the configured `model_name`s. Selecting a model per credential is future work
(issue #341); this sidecar is the translation layer it will build on.

## Bump the version

The image is pinned in `docker-compose.yml` (`ghcr.io/berriai/litellm:<version>`).
Bump it deliberately; the plain `litellm` image is the DB-free proxy (the
`litellm-database` variant is the heavier one).
