-- Setup-script changes the agent made to itself (issue #340). The agent can edit
-- a repo's `setup_script` or the global `base_setup_script` through the Seraphim
-- MCP when it spots an environment optimization (e.g. "add `yarn install` so UI
-- tasks build immediately"). Every change is recorded here so it is never silent:
-- the board surfaces the unacknowledged ones in a banner and a one-time
-- notification, and the row keeps the before/after for a full audit + manual revert.
--
-- `task_id` is the task the agent was working when it made the change (SET NULL if
-- that task is later deleted, so the audit outlives it). `target` is 'repo' or
-- 'base'; for a repo change, `repo_id` links the repo (SET NULL on delete) and
-- `repo_full_name` snapshots the name so the record reads even after a rename/delete.
CREATE TABLE setup_script_changes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id        UUID REFERENCES tasks(id) ON DELETE SET NULL,
    target         TEXT NOT NULL CHECK (target IN ('repo', 'base')),
    repo_id        UUID REFERENCES repositories(id) ON DELETE SET NULL,
    repo_full_name TEXT,
    old_script     TEXT NOT NULL,
    new_script     TEXT NOT NULL,
    -- The agent's one-line "why", shown to the operator so the change is explained.
    summary        TEXT NOT NULL DEFAULT '',
    acknowledged   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The board reads the unacknowledged ones newest-first for its banner.
CREATE INDEX setup_script_changes_unacked_idx
    ON setup_script_changes (created_at DESC)
    WHERE acknowledged = FALSE;
