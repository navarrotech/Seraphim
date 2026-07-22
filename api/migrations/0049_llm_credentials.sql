-- Multiple Claude credentials with priority rotation (issue #341).
--
-- Replaces the single credential that lived on the `settings` row with a
-- first-class, priority-ordered table. The agent runs on the highest-priority
-- usable credential; when one hits its usage limit it is marked exhausted and the
-- agent rotates to the next, pausing only when every credential is exhausted.
--
-- The schema is provider-agnostic so other LLMs can be added later (issue #342's
-- LiteLLM sidecar): `provider` names the logical provider and `base_url` is the
-- Anthropic-compatible endpoint a non-Anthropic credential is reached through
-- (empty = Anthropic direct). Today only `anthropic` with the three Claude kinds.

CREATE TABLE llm_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Logical provider. 'anthropic' today; future: 'openai', 'xai', 'moonshot', ...
    provider TEXT NOT NULL DEFAULT 'anthropic',
    -- How the credential authenticates the Claude Code CLI:
    --   'subscription_oauth' -> CLAUDE_CODE_OAUTH_TOKEN, refreshing OAuth pair + usage gauge
    --   'setup_token'        -> CLAUDE_CODE_OAUTH_TOKEN, long-lived pasted token, no refresh
    --   'api_key'            -> ANTHROPIC_API_KEY
    kind TEXT NOT NULL CHECK (kind IN ('subscription_oauth', 'setup_token', 'api_key')),
    -- Operator-facing name (seeded from the account email for OAuth logins).
    label TEXT NOT NULL DEFAULT '',
    -- Priority: lower runs first. Fractional so a drag-drop reorder rewrites rows cheaply.
    position DOUBLE PRECISION NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    -- The inference credential the agent runs on: the sk-ant-oat token, or the API key.
    secret TEXT NOT NULL DEFAULT '',
    -- Refreshing OAuth material (subscription_oauth only; empty for the other kinds).
    oauth_access_token TEXT NOT NULL DEFAULT '',
    oauth_refresh_token TEXT NOT NULL DEFAULT '',
    oauth_expires_at TIMESTAMPTZ,
    oauth_scopes TEXT NOT NULL DEFAULT '',
    account_email TEXT NOT NULL DEFAULT '',
    -- Future non-Anthropic routing via the LiteLLM sidecar (ANTHROPIC_BASE_URL).
    -- Empty = talk to Anthropic directly.
    base_url TEXT NOT NULL DEFAULT '',
    -- Rotation state: until when this credential is unavailable after hitting its
    -- usage window. NULL = available; cleared lazily once the reset time passes.
    exhausted_until TIMESTAMPTZ,
    -- Last failure reason (an exhausted window, a dead refresh token), shown on the
    -- LLMs page so the operator can act. NULL when the credential is healthy.
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The rotation query orders enabled credentials by priority.
CREATE INDEX llm_credentials_priority_idx ON llm_credentials (enabled, position);

-- Migrate the existing single credential (if any) into the table as entry #1.
-- The kind is inferred from the old auth mode: an API key stays an API key; a
-- subscription with a stored refresh token is an OAuth login; a subscription
-- without one is a manually pasted setup-token.
INSERT INTO llm_credentials (
    provider, kind, label, position, enabled, secret,
    oauth_access_token, oauth_refresh_token, oauth_expires_at, oauth_scopes, account_email
)
SELECT
    'anthropic',
    CASE
        WHEN claude_auth_mode = 'api_key' THEN 'api_key'
        WHEN claude_usage_refresh_token <> '' THEN 'subscription_oauth'
        ELSE 'setup_token'
    END,
    claude_account_email,
    1000,
    TRUE,
    claude_oauth_token,
    claude_usage_access_token,
    claude_usage_refresh_token,
    claude_usage_expires_at,
    claude_usage_scopes,
    claude_account_email
FROM settings
WHERE id = 1 AND claude_oauth_token <> '';

-- The per-credential columns now live in llm_credentials; drop them from settings.
-- The global usage-pause controls (usage_limit_pause_enabled, usage_limit_threshold,
-- usage_paused_until) stay: they gate the whole agent when ALL credentials exhaust.
ALTER TABLE settings
    DROP COLUMN claude_oauth_token,
    DROP COLUMN claude_auth_mode,
    DROP COLUMN claude_usage_access_token,
    DROP COLUMN claude_usage_refresh_token,
    DROP COLUMN claude_usage_expires_at,
    DROP COLUMN claude_usage_scopes,
    DROP COLUMN claude_account_email;

-- The enum backed only the dropped column; remove it so it does not dangle.
DROP TYPE IF EXISTS claude_auth_mode;
