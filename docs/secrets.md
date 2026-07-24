# Secrets and sensitive data

> Decision record for how Seraphim stores and exposes secrets. Current state and
> roadmap only, no history. `CLAUDE.md` holds the endpoint-level detail.

## Decisions today

- **Tokens live in the database, not `.env`.** The Claude credentials and the
  GitHub token are set in the Settings UI and stored in Postgres, so a worm
  scanning `.env` files cannot harvest them. The API only ever exposes `*_token_set`
  booleans plus a masked `*_token_preview`, never the raw values, and writes go
  through dedicated endpoints. The tokens are injected into the agent's `claude`
  and `git` execs as environment at call time. See [llm.md](./llm.md) for the
  Claude credential rotation.
- **The Postgres password stays in `.env`.** The API needs it to connect before
  it can read anything. For at-rest protection use host disk encryption (BitLocker
  or LUKS); Postgres does not encrypt at rest itself.
- **Environment variables are scrubbed.** User-defined `environment_variables`
  marked secret are scrubbed out of Claude's output before anything is persisted
  or streamed (`secrets::Scrubber`), and the API returns their values masked.
- **Blobs are never inlined.** Task screenshots and attachments are stored as
  `bytea` and streamed by a dedicated route (`GET /screenshots/:id`,
  `GET /attachments/:id`), never returned in board or task JSON, which carry
  metadata only. Because these bytes persist in Postgres, they are for dev and
  test data only and rely on the same at-rest disk encryption as the tokens.
- **Webhook authentication.** Inbound GitHub and Jira webhooks are authenticated
  by a per-provider shared secret on the settings row (GitHub HMAC-signs the body;
  Jira signs or carries `?secret=`).

## Where it lives

- `api/src/http/settings.rs`: the token and environment-variable endpoints.
- `api/src/secrets.rs`: the output scrubber.
- `.env.example`: the non-secret bootstrap configuration (Postgres creds, ports,
  `SSH_HOME`, `TS_AUTHKEY`, the git identity).
- See [settings.md](./settings.md) for where these fields sit in the schema.
