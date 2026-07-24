//! Provisioning the multi-repo workspace.
//!
//! Claude is always spawned at `/workspace`, with every enabled repo cloned flat
//! beside it (`/workspace/{repo}`) so cross-repo work is natural. Global agent
//! instructions become `/workspace/AGENTS.md`; per-repo instructions become
//! `/workspace/{repo}/CLAUDE.md`. The `~/.claude` config repo is cloned into
//! `CLAUDE_CONFIG_DIR` for a portable, host-mount-free setup.
//!
//! Two entry points: [`provision_workspace`] (heavy, sets up everything) and
//! [`prepare_branch`] (light, per-task: ensure the focus repo and cut a branch).
//!
//! Every prep exec is scoped to a railway's container (issue #203). `main` always
//! targets the compose-managed workspace, so its behavior is unchanged; a non-
//! `main` railway targets its own per-railway container and clones only the repos
//! assigned to that railway. The plumbing is the same in both cases; only the
//! container name and the repo set differ.

use std::collections::HashSet;

use base64::Engine;
use eyre::{eyre, Result};
use tracing::{info, warn};

use super::network;
use super::railway::RailwayHandle;
use crate::db::models::{Repository, Settings};
use crate::db::queries;
use crate::state::AppState;

/// The flat directory name a repo is cloned into: the part after the last `/`.
pub fn repo_dir_name(full_name: &str) -> &str {
    full_name.rsplit('/').next().unwrap_or(full_name)
}

/// Base64 so file contents cross the `docker exec` boundary unquoted.
fn encode(content: &str) -> String {
    base64::engine::general_purpose::STANDARD.encode(content)
}

/// A bash snippet that writes `content` to `path`, or removes the file when the
/// content is empty (so stale instructions don't linger).
fn write_file_snippet(path: &str, content: &str) -> String {
    if content.trim().is_empty() {
        format!("rm -f \"{path}\"\n")
    } else {
        format!("echo \"{}\" | base64 -d > \"{path}\"\n", encode(content))
    }
}

/// Bash that installs the operator's per-repo `instructions` as `{dir}/CLAUDE.md`
/// (so Claude auto-loads them) WITHOUT ever clobbering a `CLAUDE.md` the repo
/// commits itself (issue #385).
///
/// Per-repo instructions ride in the repo's own `CLAUDE.md` path, but many repos
/// (Seraphim included) track their own `CLAUDE.md`. Managing that path
/// unconditionally deleted it whenever `instructions` was empty (the common case),
/// leaving the repo's tracked file staged for deletion, which a later `git add -A`
/// then swept into the commit. So the write-or-clear only runs when the repo does
/// NOT track a `CLAUDE.md` of its own; a committed one is left untouched. A repo
/// that ships its own `CLAUDE.md` therefore ignores per-repo instructions here,
/// the safe trade against destroying its file.
fn per_repo_claude_md_snippet(dir: &str, instructions: &str) -> String {
    let manage = write_file_snippet(&format!("{dir}/CLAUDE.md"), instructions);
    // `git ls-files --error-unmatch` exits non-zero for an untracked path; it sits
    // in an `if` condition, so it is safe under the outer script's `set -e`.
    format!(
        "if git -C \"{dir}\" ls-files --error-unmatch CLAUDE.md >/dev/null 2>&1; then\n\
         \x20 : # the repo commits its own CLAUDE.md; never clobber it (issue #385)\n\
         else\n\
         {manage}\
         fi\n",
        dir = dir,
        manage = manage,
    )
}

/// Clone-or-update the `~/.claude` config repo into `CLAUDE_CONFIG_DIR`. Uses
/// init+fetch+checkout so a non-empty dir (with a persisted `projects/`) is fine.
fn config_repo_snippet(config_repo_url: &str) -> String {
    if config_repo_url.trim().is_empty() {
        return String::new();
    }
    format!(
        "if [ -d \"$CLAUDE_CONFIG_DIR/.git\" ]; then\n\
           git -C \"$CLAUDE_CONFIG_DIR\" checkout -- . 2>/dev/null || true\n\
           git -C \"$CLAUDE_CONFIG_DIR\" pull --ff-only\n\
         else\n\
           mkdir -p \"$CLAUDE_CONFIG_DIR\"\n\
           git init -q \"$CLAUDE_CONFIG_DIR\"\n\
           git -C \"$CLAUDE_CONFIG_DIR\" remote add origin \"{url}\" 2>/dev/null \
             || git -C \"$CLAUDE_CONFIG_DIR\" remote set-url origin \"{url}\"\n\
           git -C \"$CLAUDE_CONFIG_DIR\" fetch --depth 1 origin\n\
           DEFAULT_REF=$(git -C \"$CLAUDE_CONFIG_DIR\" remote show origin | sed -n 's/.*HEAD branch: //p')\n\
           git -C \"$CLAUDE_CONFIG_DIR\" checkout -f \"${{DEFAULT_REF:-main}}\"\n\
         fi\n",
        url = config_repo_url
    )
}

/// Common script prelude: config dir default + global AGENTS.md. The config repo
/// is handled separately by [`provision_config_repo`] so its failures are
/// isolated and reported.
fn prelude_agents(settings: &Settings) -> String {
    format!(
        ": \"${{CLAUDE_CONFIG_DIR:=/workspace/.claude}}\"\n\
         mkdir -p \"$CLAUDE_CONFIG_DIR/projects\"\n\
         {agents}",
        agents = write_file_snippet("/workspace/AGENTS.md", &settings.global_instructions),
    )
}

/// Clones/refreshes the `~/.claude` config repo as its own hard-failing step and
/// records the outcome in `settings.config_repo_error`. A blank `config_repo_url`
/// is a no-op that clears any prior error (the agent runs unconfigured).
///
/// On failure the error is persisted (so the UI banners it and the agent halts)
/// and returned.
///
/// `handle` selects the railway's container; the config repo is cloned into each
/// railway's own container so every lane has the agent's brain (issue #203).
pub async fn provision_config_repo(state: &AppState, handle: &RailwayHandle) -> Result<()> {
    let settings = queries::get_settings(&state.db).await?;
    if settings.config_repo_url.trim().is_empty() {
        queries::set_config_repo_error(&state.db, None).await?;
        return Ok(());
    }

    let script = format!(
        "set -e\n\
         : \"${{CLAUDE_CONFIG_DIR:=/workspace/.claude}}\"\n\
         {config}\
         mkdir -p \"$CLAUDE_CONFIG_DIR/projects\"\n",
        config = config_repo_snippet(&settings.config_repo_url),
    );

    match run(state, handle.container(), &script).await {
        Ok(()) => {
            queries::set_config_repo_error(&state.db, None).await?;
            Ok(())
        }
        Err(error) => {
            // Recording the failure is the priority; surface it even if the write
            // itself somehow fails.
            let _ = queries::set_config_repo_error(&state.db, Some(&format!("{error}"))).await;
            Err(error)
        }
    }
}

/// A small Python program that merges the managed network `permissions` block
/// into the agent's `settings.json` without clobbering anything else. It reads
/// the target path and the managed `{allow, deny}` object from the environment,
/// drops any previously-managed network rules, keeps the operator's own rules,
/// and appends the current policy. Python (not jq) because it ships in the
/// workspace image and handles "file missing / not yet valid JSON" cleanly.
const NETWORK_MERGE_PY: &str = r#"
import json, os

path = os.environ["SERAPHIM_SETTINGS_PATH"]
managed = json.loads(os.environ["SERAPHIM_MANAGED_PERMS"])

try:
    with open(path) as fh:
        data = json.load(fh)
    if not isinstance(data, dict):
        data = {}
except (FileNotFoundError, json.JSONDecodeError):
    data = {}

perms = data.get("permissions")
if not isinstance(perms, dict):
    perms = {}
data["permissions"] = perms

def is_network_rule(rule):
    return (
        rule == "WebFetch"
        or rule.startswith("WebFetch(")
        or rule == "WebSearch"
        or rule in ("Bash(curl:*)", "Bash(wget:*)")
    )

for key in ("allow", "deny"):
    current = perms.get(key)
    current = [r for r in current if isinstance(r, str)] if isinstance(current, list) else []
    kept = [r for r in current if not is_network_rule(r)]
    added = [r for r in managed.get(key, []) if r not in kept]
    perms[key] = kept + added

with open(path, "w") as fh:
    json.dump(data, fh, indent=2)
    fh.write("\n")
"#;

/// Translates the operator's network access policy into the agent's
/// `~/.claude/settings.json` permissions and merges it in. Runs after the config
/// repo is (re)cloned so it patches whatever `settings.json` the operator ships,
/// rather than being overwritten by it.
pub async fn apply_network_policy(state: &AppState, handle: &RailwayHandle) -> Result<()> {
    let settings = queries::get_settings(&state.db).await?;
    let managed = encode(&serde_json::to_string(&network::managed_permissions(
        &settings,
    ))?);
    let script = encode(NETWORK_MERGE_PY);

    let bash = format!(
        ": \"${{CLAUDE_CONFIG_DIR:=/workspace/.claude}}\"\n\
         mkdir -p \"$CLAUDE_CONFIG_DIR\"\n\
         SERAPHIM_SETTINGS_PATH=\"$CLAUDE_CONFIG_DIR/settings.json\" \\\n\
         SERAPHIM_MANAGED_PERMS=\"$(echo {managed} | base64 -d)\" \\\n\
         python3 -c \"$(echo {script} | base64 -d)\"\n",
    );
    run(state, handle.container(), &bash).await
}

/// Full provision of a railway's container: config repo (hard fail) + network
/// policy + env setup + every enabled repo assigned to this railway (clone/update,
/// per-repo CLAUDE.md, per-repo setup).
///
/// `handle` selects which container to provision and which repos belong to it: a
/// repo belongs to exactly one railway, so a non-`main` railway clones only its
/// own repos, while `main` clones everything assigned to `main`. With only the
/// `main` railway present, that is every repo, identical to the prior behavior.
pub async fn provision_workspace(state: &AppState, handle: &RailwayHandle) -> Result<()> {
    // The config repo is the agent's brain (AGENTS.md, skills, docs); set it up
    // first and stop if it fails.
    provision_config_repo(state, handle).await?;
    // Then stamp the network policy onto its settings.json (or a fresh one).
    apply_network_policy(state, handle).await?;

    let settings = queries::get_settings(&state.db).await?;
    let repos = queries::list_repositories_for_railway(&state.db, handle.id).await?;

    let mut script = String::from("set -e\n");
    script.push_str(&prelude_agents(&settings));

    // Environment setup runs once here (installs CLIs/toolchains), not per task.
    if !settings.base_setup_script.trim().is_empty() {
        script.push_str("# --- environment setup ---\n");
        script.push_str(&settings.base_setup_script);
        script.push('\n');
    }

    for repo in repos.iter().filter(|repo| repo.enabled) {
        script.push_str(&repo_block(repo, true));
    }

    run(state, handle.container(), &script).await?;

    // Self-heal orphaned clone dirs a lost in-memory removal or an offline deletion
    // left behind (issue #380). Best-effort: a cleanup failure must not fail an
    // otherwise-successful provision, so it is logged rather than propagated.
    if let Err(error) = reconcile_orphan_repo_dirs(state, handle, &repos).await {
        warn!(error = %error, railway_id = %handle.id, "failed to reconcile orphaned repo clone dirs");
    }
    Ok(())
}

/// Clones (or, if already cloned, fetches) a single repo into the railway's
/// container, out of band from a full provision (issue #343). The realtime add path
/// so a newly-added repo lands in the workspace immediately rather than only on the
/// next full provision. Idempotent, and it never re-runs the setup script on an
/// existing clone (that stays a per-task concern, #275), so re-running it for an
/// edited repo just refreshes the clone and its `CLAUDE.md`.
///
/// AGENTS.md and the config repo already exist from the full provision, so this
/// writes only this repo's `CLAUDE.md`, not the shared prelude.
pub async fn clone_repo(state: &AppState, handle: &RailwayHandle, repo: &Repository) -> Result<()> {
    let script = format!("set -e\n{}", repo_block(repo, false));
    run(state, handle.container(), &script).await
}

/// Removes the given repo clone directories from the railway's container (issue
/// #343). Best-effort `rm -rf`; a missing dir is a no-op. Applied between the
/// agent's tasks so a running turn is never disrupted. Unsafe names (empty, `.`,
/// `..`, or containing `/`) are skipped so this can only ever delete a flat repo
/// clone under `/workspace`.
pub async fn remove_repo_dirs(
    state: &AppState,
    handle: &RailwayHandle,
    dir_names: &[String],
) -> Result<()> {
    let script = removal_script(dir_names);
    if script.is_empty() {
        return Ok(());
    }
    run(state, handle.container(), &script).await
}

/// Whether a name is safe to `rm -rf` as a direct child of `/workspace`: a
/// non-empty flat name, never `.`/`..` or a path that could escape the directory.
fn is_safe_repo_dir(name: &str) -> bool {
    !name.is_empty() && name != "." && name != ".." && !name.contains('/')
}

/// Builds the `rm -rf` script for the removal dirs, skipping any unsafe name. The
/// `--` and quoting keep a repo name that starts with `-` or contains spaces safe.
fn removal_script(dir_names: &[String]) -> String {
    let mut script = String::new();
    for name in dir_names.iter().filter(|name| is_safe_repo_dir(name)) {
        script.push_str(&format!("rm -rf -- \"/workspace/{name}\"\n"));
    }
    script
}

/// The `~/.claude` config repo is itself a git clone under `/workspace`, so the
/// `.git` filter alone would flag it. Guard its dir name explicitly wherever a
/// reconcile might otherwise consider it removable.
const CLAUDE_CONFIG_DIR_NAME: &str = ".claude";

/// Bash that prints, marked and one per line, each flat git-clone dir directly
/// under `/workspace`. The `/workspace/*/` glob skips dot dirs, so the `.claude`
/// config clone is never even listed; `nullglob` makes an empty `/workspace` a
/// no-op; the `REPODIR:` marker lets the caller pick the names out of a `docker
/// exec`'s combined stdout/stderr.
const REPO_DIR_LIST_SCRIPT: &str = r#"shopt -s nullglob
for path in /workspace/*/; do
  name="${path%/}"; name="${name##*/}"
  [ -e "${path}.git" ] && printf 'REPODIR:%s\n' "$name"
done
"#;

/// Removes orphaned repo clone dirs under `/workspace` at provision time (issue
/// #380): any flat git-clone dir not backed by an enabled repo assigned to this
/// railway. This self-heals a removal lost across an API restart (the removal queue
/// is in-memory, issue #343) and a repo deleted while the API was down or before
/// #343 existed.
///
/// Fails closed on every axis: only flat git-clone dirs are candidates, `.claude`
/// (a git clone too) is never touched, and an empty desired set is treated as
/// untrusted and skipped (see [`orphan_repo_dirs`]), so a transient empty read can
/// never trigger a broad delete.
async fn reconcile_orphan_repo_dirs(
    state: &AppState,
    handle: &RailwayHandle,
    repos: &[Repository],
) -> Result<()> {
    let desired: HashSet<&str> = repos
        .iter()
        .filter(|repo| repo.enabled)
        .map(|repo| repo_dir_name(&repo.full_name))
        .collect();

    let present = list_repo_clone_dirs(state, handle).await?;
    let orphans = orphan_repo_dirs(&present, &desired);
    if orphans.is_empty() {
        return Ok(());
    }

    info!(
        railway_id = %handle.id,
        orphans = ?orphans,
        "reconcile: removing orphaned repo clone dirs not backed by an enabled repo"
    );
    remove_repo_dirs(state, handle, &orphans).await
}

/// Lists the flat git-clone directory names directly under `/workspace` in the
/// railway's container (see [`REPO_DIR_LIST_SCRIPT`]).
async fn list_repo_clone_dirs(state: &AppState, handle: &RailwayHandle) -> Result<Vec<String>> {
    let output = state
        .workspace
        .exec_capture_in(
            handle.container(),
            "/workspace",
            vec![
                "bash".to_string(),
                "-c".to_string(),
                REPO_DIR_LIST_SCRIPT.to_string(),
            ],
            Vec::new(),
        )
        .await?;
    if !output.succeeded() {
        return Err(eyre!(
            "listing workspace clone dirs exited {}: {}",
            output.exit_code,
            output.output
        ));
    }
    Ok(parse_listed_dirs(&output.output))
}

/// Extracts the marked clone dir names from a `docker exec`'s combined output,
/// dropping any profile or stderr noise. Pure, so it is unit-tested.
fn parse_listed_dirs(output: &str) -> Vec<String> {
    output
        .lines()
        .filter_map(|line| line.trim().strip_prefix("REPODIR:"))
        .map(str::to_string)
        .collect()
}

/// The clone dirs present in the container but not desired. An orphan is any listed
/// dir whose name is not in `desired`, is not the protected `.claude` config clone,
/// and is a safe flat name. Pure, so the whole policy is unit-tested.
///
/// Fails closed on an empty desired set: a railway with no enabled repos is
/// indistinguishable from a transient empty read, so it returns nothing rather than
/// flag every clone as an orphan. Any lingering clones clear on the next provision
/// once an enabled repo exists again.
fn orphan_repo_dirs(present: &[String], desired: &HashSet<&str>) -> Vec<String> {
    if desired.is_empty() {
        return Vec::new();
    }
    present
        .iter()
        .filter(|name| name.as_str() != CLAUDE_CONFIG_DIR_NAME)
        .filter(|name| !desired.contains(name.as_str()))
        .filter(|name| is_safe_repo_dir(name))
        .cloned()
        .collect()
}

/// Bash that returns a repo's working tree to a clean state before a checkout.
///
/// A turn interrupted mid-merge/rebase (e.g. the API restarting during a
/// conflict-resolving revisit) leaves an unresolved index that makes every later
/// `git checkout` fail with "you need to resolve your current index first". These
/// are safe no-ops when nothing is in progress.
fn reset_tree_snippet() -> &'static str {
    "git merge --abort 2>/dev/null || true\n\
     git rebase --abort 2>/dev/null || true\n\
     git reset --hard 2>/dev/null || true\n"
}

/// Per-task prep: ensure config + AGENTS.md + the focus repo, then cut `branch`,
/// all in the task's railway container (`handle`).
pub async fn prepare_branch(
    state: &AppState,
    handle: &RailwayHandle,
    settings: &Settings,
    repo: &Repository,
    branch: &str,
) -> Result<()> {
    let dir = format!("/workspace/{}", repo_dir_name(&repo.full_name));

    let mut script = String::from("set -e\n");
    script.push_str(&prelude_agents(settings));
    // Ensure the focus repo exists (clone + setup on first sight), then branch.
    // Repos opted into `setup_script_always_run` also re-run setup on the existing
    // clone, so a stacked-dependency merge that added deps gets them reinstalled
    // before this task's build/test (issue #275).
    script.push_str(&repo_block(repo, repo.setup_script_always_run));
    script.push_str(&format!("cd \"{dir}\"\n", dir = dir));
    script.push_str(reset_tree_snippet());
    script.push_str(&branch_prep_snippet(&repo.default_branch, branch));
    // Re-sync submodules to the freshly-checked-out branch's pinned commits, failing
    // loudly if a private submodule is inaccessible (issue #251).
    script.push_str(&submodule_update_snippet(&dir));

    run(state, handle.container(), &script).await
}

/// Bash that re-ups the target branch, then cuts a fresh work branch from it.
///
/// Always fetches `default` from origin so the work branch starts from the
/// latest target rather than whatever the clone last saw, then branches from
/// the freshly-fetched `origin/{default}`. The fetch runs under the caller's
/// `set -e`: an unreachable origin fails preparation loudly instead of silently
/// building on a stale base, which would otherwise leave this PR (and every one
/// cut after it) with avoidable merge conflicts once another PR lands on the
/// target in parallel (issue #187). Mirrors the hard fetch in
/// [`prepare_existing_branch`].
fn branch_prep_snippet(default: &str, branch: &str) -> String {
    format!(
        "git fetch origin \"{default}\"\n\
         git checkout -B \"{branch}\" \"origin/{default}\"\n"
    )
}

/// Per-task prep for a CI fix: ensure the repo and AGENTS.md, then check out the
/// PR's existing branch at its pushed tip (so the agent's earlier commits are
/// present). Unlike [`prepare_branch`], this never re-cuts the branch from the
/// default, which would discard the work the PR is built on.
pub async fn prepare_existing_branch(
    state: &AppState,
    handle: &RailwayHandle,
    settings: &Settings,
    repo: &Repository,
    branch: &str,
) -> Result<()> {
    let dir = format!("/workspace/{}", repo_dir_name(&repo.full_name));

    let mut script = String::from("set -e\n");
    script.push_str(&prelude_agents(settings));
    // Ensure the focus repo exists (clone on first sight), then sync to the
    // remote branch tip CI actually tested. Honor `setup_script_always_run` here
    // too so a fix turn rebuilds deps if the branch's deps changed (issue #275).
    script.push_str(&repo_block(repo, repo.setup_script_always_run));
    script.push_str(&format!("cd \"{dir}\"\n", dir = dir));
    script.push_str(reset_tree_snippet());
    script.push_str(&format!(
        "git fetch origin\n\
         git checkout -B \"{branch}\" \"origin/{branch}\"\n\
         git reset --hard \"origin/{branch}\"\n",
        branch = branch,
    ));
    // Re-sync submodules to this branch's pinned commits, failing loudly if a
    // private submodule is inaccessible (issue #251).
    script.push_str(&submodule_update_snippet(&dir));

    run(state, handle.container(), &script).await
}

/// Bash that initializes a repo's git submodules (issue #251), generic to any repo
/// that has them: a no-op when there is no `.gitmodules`, otherwise
/// `git submodule update --init --recursive`.
///
/// Crucially it does NOT fail silently (the same principle as the config-repo and
/// repo-sync error paths). The common failure is the workspace's mounted SSH /
/// deploy key lacking read access to a *private* submodule repo (e.g. Plunder's
/// `brand`); when that happens this names the offending submodule URL(s) and the
/// fix, then exits non-zero, so the operator gets an actionable message up front
/// instead of a generic build failure mid-task. Runs under the caller's `set -e`.
fn submodule_update_snippet(dir: &str) -> String {
    format!(
        "if [ -f \"{dir}/.gitmodules\" ]; then\n\
         if ! git -C \"{dir}\" submodule update --init --recursive; then\n\
         echo \"ERROR: could not initialize git submodules for {dir}.\" >&2\n\
         echo \"The workspace SSH/deploy key likely lacks read access to a private submodule repo:\" >&2\n\
         git config -f \"{dir}/.gitmodules\" --get-regexp 'submodule[.].*[.]url' 2>/dev/null | awk '{{ print \"  - \" $2 }}' >&2\n\
         echo \"Grant the mounted host SSH key (or a deploy key) read access to the repo(s) above, then re-provision.\" >&2\n\
         echo \"For Plunder's private brand submodule this is the BRAND_DEPLOY_KEY deploy key (companion ticket).\" >&2\n\
         exit 1\n\
         fi\n\
         fi\n"
    )
}

/// Bash to clone-or-update a single repo, write its CLAUDE.md, and run its setup
/// script. Setup always runs on a fresh clone; on an existing clone it runs only
/// when `always_setup` is set (a full provision, or a repo opted into
/// `setup_script_always_run` for per-task re-runs, issue #275).
fn repo_block(repo: &Repository, always_setup: bool) -> String {
    let dir = format!("/workspace/{}", repo_dir_name(&repo.full_name));
    let setup = repo.setup_script.trim();

    // Run the setup script in a subshell `cd`'d into the repo. `cd` is on its own
    // line so every newline-separated command runs there, sequentially, under the
    // outer `set -e` (no `&&` chaining required by the user).
    let setup_block = if setup.is_empty() {
        String::new()
    } else {
        format!("(\ncd \"{dir}\"\n{setup}\n)\n")
    };

    // Run setup after a fresh clone; on an existing clone, only when the caller
    // opted in (full provision, or a per-task re-run for an opted-in repo, #275).
    let clone_setup = setup_block.clone();
    let update_setup = if always_setup {
        setup_block
    } else {
        String::new()
    };

    // Clone (or fetch) the superproject, then initialize submodules explicitly via
    // `submodule_update_snippet` so a missing/private submodule fails loudly and
    // helpfully rather than as a silent partial clone (issue #251). Submodules are
    // brought up BEFORE the setup script, since a repo's build/setup (e.g. Plunder's)
    // may import from a submodule.
    let submodules = submodule_update_snippet(&dir);
    format!(
        "if [ -d \"{dir}/.git\" ]; then\n\
           git -C \"{dir}\" fetch origin || true\n\
           {submodules}\
           {update_setup}\
         else\n\
           git clone \"{clone_url}\" \"{dir}\"\n\
           {submodules}\
           {clone_setup}\
         fi\n\
         {claude_md}",
        dir = dir,
        clone_url = repo.clone_url,
        submodules = submodules,
        claude_md = per_repo_claude_md_snippet(&dir, &repo.instructions),
    )
}

/// Runs a prep script in `container`, surfacing a non-zero exit as an error.
///
/// The container is the railway's: `main`'s is the compose-managed workspace, a
/// non-`main` railway's is its own per-railway container (issue #203).
async fn run(state: &AppState, container: &str, script: &str) -> Result<()> {
    let github_token = queries::get_github_token(&state.db).await?;
    // Wire git's credential helper for HTTPS remotes (GH_TOKEN is in this exec's
    // env); SSH remotes use the mounted key instead.
    let full_script = format!("gh auth setup-git >/dev/null 2>&1 || true\n{script}");
    // User-defined env vars are available to setup scripts (e.g. registry tokens).
    let mut env = vec![format!("GH_TOKEN={github_token}")];
    for variable in queries::list_environment_variables(&state.db).await? {
        env.push(format!("{}={}", variable.key, variable.value));
    }
    let output = state
        .workspace
        .exec_capture_in(
            container,
            "/workspace",
            vec!["bash".to_string(), "-lc".to_string(), full_script],
            env,
        )
        .await?;

    if !output.succeeded() {
        return Err(eyre!(
            "workspace prep exited {}: {}",
            output.exit_code,
            output.output
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        branch_prep_snippet, is_safe_repo_dir, orphan_repo_dirs, parse_listed_dirs,
        per_repo_claude_md_snippet, removal_script, repo_block, submodule_update_snippet,
        REPO_DIR_LIST_SCRIPT,
    };
    use crate::db::models::Repository;
    use chrono::Utc;
    use std::collections::HashSet;
    use uuid::Uuid;

    fn repo() -> Repository {
        Repository {
            id: Uuid::nil(),
            railway_id: Uuid::nil(),
            full_name: "JalapenoLabs/Plunder".to_string(),
            clone_url: "git@github.com:JalapenoLabs/Plunder.git".to_string(),
            default_branch: "main".to_string(),
            branch_template: None,
            setup_script: String::new(),
            instructions: String::new(),
            review_policy: None,
            enabled: true,
            sync_issues: false,
            issue_labels: Vec::new(),
            setup_script_always_run: false,
            sync_error: None,
            sync_error_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[test]
    fn branch_prep_fetches_the_target_then_cuts_from_its_fresh_tip() {
        let script = branch_prep_snippet("develop", "seraphim/issue-187-foo");

        // Re-up the target branch before any work begins (issue #187).
        assert!(script.contains("git fetch origin \"develop\""));
        // Cut the work branch from the freshly-fetched remote tip, not a local
        // branch that may be behind.
        assert!(script.contains("git checkout -B \"seraphim/issue-187-foo\" \"origin/develop\""));
    }

    #[test]
    fn branch_prep_does_not_swallow_a_failed_fetch() {
        // The old `git pull --ff-only ... || true` masked an unreachable origin
        // and let a stale base through. The fetch must run bare so prep fails
        // loudly instead.
        let script = branch_prep_snippet("main", "branch");
        assert!(!script.contains("pull"));
        assert!(!script.contains("git fetch origin \"main\" || true"));
        // Submodule handling moved to `submodule_update_snippet`, which no longer
        // swallows failures; the silenced form must be gone (issue #251).
        assert!(!script.contains("submodule update --init --recursive || true"));
    }

    #[test]
    fn submodule_snippet_inits_and_fails_loudly_with_an_actionable_message() {
        let script = submodule_update_snippet("/workspace/Plunder");

        // Only acts when the repo actually has submodules, so it is a safe no-op
        // for the common (no-submodule) repo.
        assert!(script.contains(".gitmodules"));
        // Initializes recursively.
        assert!(
            script.contains("git -C \"/workspace/Plunder\" submodule update --init --recursive")
        );
        // Does NOT fail silently (the whole point of issue #251).
        assert!(!script.contains("submodule update --init --recursive || true"));
        // On failure it names the access problem + the offending repo URLs + the fix,
        // then exits non-zero so it surfaces instead of a generic mid-task failure.
        assert!(script.contains("read access to a private submodule repo"));
        assert!(script.contains("--get-regexp"));
        assert!(script.contains("BRAND_DEPLOY_KEY"));
        assert!(script.contains("exit 1"));
    }

    #[test]
    fn repo_block_reruns_setup_on_existing_clone_only_when_opted_in() {
        // A repo with a setup script. The marker is distinctive so we can count how
        // many times the setup block is emitted across the clone/update branches.
        let mut repo = repo();
        repo.setup_script = "yarn install --frozen-lockfile".to_string();

        // Per-task default (existing clone): setup runs on a fresh clone only, so
        // the marker appears exactly once (issue #275: opted-out repos unchanged).
        let once = repo_block(&repo, false);
        assert_eq!(once.matches("yarn install --frozen-lockfile").count(), 1);

        // Opted in (or a full provision): setup also runs on the existing clone, so
        // the marker appears in both the clone and the update branch.
        let twice = repo_block(&repo, true);
        assert_eq!(twice.matches("yarn install --frozen-lockfile").count(), 2);
    }

    #[test]
    fn repo_block_initializes_submodules_explicitly_without_recurse_clone() {
        let script = repo_block(&repo(), true);

        // The clone no longer relies on `--recurse-submodules` (which would fail with
        // a generic message); submodules are initialized by the explicit, loud snippet.
        assert!(!script.contains("--recurse-submodules"));
        assert!(
            script.contains("git submodule update --init --recursive")
                || script.contains("submodule update --init --recursive")
        );
        assert!(script.contains("exit 1"));
    }

    #[test]
    fn removal_script_rms_each_safe_dir_and_skips_unsafe_ones() {
        let script = removal_script(&[
            "Plunder".to_string(),
            "my.repo".to_string(),
            // Unsafe names must never make it into an `rm`.
            "..".to_string(),
            ".".to_string(),
            "a/b".to_string(),
            String::new(),
        ]);
        assert!(script.contains("rm -rf -- \"/workspace/Plunder\""));
        assert!(script.contains("rm -rf -- \"/workspace/my.repo\""));
        // No traversal or nested path can be emitted.
        assert!(!script.contains("/workspace/.."));
        assert!(!script.contains("/workspace/a/b"));
        // Two safe dirs -> exactly two rm lines.
        assert_eq!(script.matches("rm -rf --").count(), 2);
        // An all-unsafe (or empty) input yields no script, so nothing runs.
        assert!(removal_script(&["..".to_string()]).is_empty());
        assert!(removal_script(&[]).is_empty());
    }

    #[test]
    fn is_safe_repo_dir_rejects_traversal_and_paths() {
        assert!(is_safe_repo_dir("Plunder"));
        assert!(is_safe_repo_dir("my.repo-1_x"));
        assert!(!is_safe_repo_dir(""));
        assert!(!is_safe_repo_dir("."));
        assert!(!is_safe_repo_dir(".."));
        assert!(!is_safe_repo_dir("a/b"));
        assert!(!is_safe_repo_dir("/etc"));
    }

    #[test]
    fn orphan_repo_dirs_flags_only_clones_not_backed_by_an_enabled_repo() {
        let present = vec![
            "Plunder".to_string(),
            "yearloom".to_string(),
            // Left behind by a removal lost across a restart, or a repo deleted
            // while the API was down (issue #380).
            "old-removed".to_string(),
        ];
        let desired = HashSet::from(["Plunder", "yearloom"]);
        assert_eq!(
            orphan_repo_dirs(&present, &desired),
            vec!["old-removed".to_string()]
        );
    }

    #[test]
    fn orphan_repo_dirs_never_touches_the_claude_config_clone() {
        // `.claude` is a git clone too, so it must be protected even though it is
        // never a desired repo.
        let present = vec![".claude".to_string(), "Plunder".to_string()];
        let desired = HashSet::from(["Plunder"]);
        assert!(orphan_repo_dirs(&present, &desired).is_empty());
    }

    #[test]
    fn orphan_repo_dirs_fails_closed_on_an_empty_desired_set() {
        // A transient empty read is indistinguishable from a genuine zero-repo
        // railway, so it must never delete every clone (issue #380).
        let present = vec!["Plunder".to_string(), "yearloom".to_string()];
        let desired: HashSet<&str> = HashSet::new();
        assert!(orphan_repo_dirs(&present, &desired).is_empty());
    }

    #[test]
    fn orphan_repo_dirs_skips_unsafe_names_as_defense_in_depth() {
        // The listing yields flat basenames, but the same safe-name guard the `rm`
        // path uses still applies here so nothing but a flat repo dir can be flagged.
        let present = vec![
            "..".to_string(),
            String::new(),
            "a/b".to_string(),
            "gone".to_string(),
        ];
        let desired = HashSet::from(["Plunder"]);
        assert_eq!(
            orphan_repo_dirs(&present, &desired),
            vec!["gone".to_string()]
        );
    }

    #[test]
    fn parse_listed_dirs_takes_only_marked_lines_from_noisy_output() {
        // `docker exec` output is combined stdout/stderr, so profile or warning
        // noise must be ignored and only the marked names kept.
        let output = "motd: welcome back\n\
             REPODIR:Plunder\n\
             warning: something on stderr\n\
             REPODIR:yearloom\n";
        assert_eq!(
            parse_listed_dirs(output),
            vec!["Plunder".to_string(), "yearloom".to_string()]
        );
    }

    #[test]
    fn repo_dir_list_script_marks_git_clones_and_skips_dot_dirs() {
        // The `/workspace/*/` glob skips dot dirs, so the `.claude` config clone is
        // never listed; only git clones are printed; each is marked for parsing; and
        // nullglob makes an empty /workspace a no-op instead of a literal glob.
        assert!(REPO_DIR_LIST_SCRIPT.contains("/workspace/*/"));
        assert!(REPO_DIR_LIST_SCRIPT.contains("${path}.git"));
        assert!(REPO_DIR_LIST_SCRIPT.contains("REPODIR:"));
        assert!(REPO_DIR_LIST_SCRIPT.contains("nullglob"));
    }

    #[test]
    fn per_repo_claude_md_never_clobbers_a_committed_claude_md() {
        // Empty instructions: the write_file_snippet form is the destructive
        // `rm -f`, but it must sit behind the tracked-file guard so a repo that
        // commits its own CLAUDE.md is never deleted (issue #385).
        let empty = per_repo_claude_md_snippet("/workspace/Seraphim", "");
        assert!(empty.contains("git -C \"/workspace/Seraphim\" ls-files --error-unmatch CLAUDE.md"));
        let guard_pos = empty.find("ls-files --error-unmatch").unwrap();
        let rm_pos = empty.find("rm -f").unwrap();
        assert!(
            rm_pos > guard_pos,
            "the rm must run only in the untracked (else) branch, after the guard"
        );
        assert!(empty.contains("else"));

        // Non-empty instructions are written to the repo's CLAUDE.md, still behind
        // the same guard so a committed one is left untouched.
        let with = per_repo_claude_md_snippet("/workspace/Repo", "Do the thing.");
        assert!(with.contains("ls-files --error-unmatch CLAUDE.md"));
        assert!(with.contains("base64 -d > \"/workspace/Repo/CLAUDE.md\""));
        // The base64 write is likewise inside the else branch, not run for a
        // repo that tracks its own CLAUDE.md.
        let with_guard = with.find("ls-files --error-unmatch").unwrap();
        let with_write = with.find("base64 -d").unwrap();
        assert!(with_write > with_guard);
    }
}
