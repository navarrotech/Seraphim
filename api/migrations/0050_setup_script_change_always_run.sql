-- Let a recorded setup-script change also capture a `setup_script_always_run`
-- toggle (issue #348). The agent can now flip a repo's "re-run before every task"
-- flag through the Seraphim MCP, so a setup edit it just made actually runs on the
-- existing clone before the next task, not only on first clone / full provision.
--
-- NULL means this change did not touch the flag (every historical row, and any
-- pure script edit); TRUE/FALSE records the value the change set the flag to, so
-- the board banner and the audit trail read honestly.
ALTER TABLE setup_script_changes
    ADD COLUMN always_run BOOLEAN;
