//! The agent editing its own setup scripts (issue #340).
//!
//! Backs the Seraphim MCP (`workspace/seraphim-mcp`): the agent lists the current
//! scripts, then updates a repo's `setup_script` or the global `base_setup_script`
//! when it spots an environment optimization (e.g. "add `yarn install` so UI tasks
//! build immediately"). Every edit is recorded in `setup_script_changes` and
//! surfaced to the operator, so the agent's autonomy is never silent: a persistent
//! board banner (via the board payload) plus a one-time toast + native notification
//! (`ServerEvent::SetupScriptChanged`). The `:id/ack` route clears the banner once
//! the operator has seen the change.

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use super::ApiResult;
use crate::db::models::{Repository, SetupScriptChange};
use crate::db::queries;
use crate::state::AppState;

/// Upper bound on a submitted script, so a runaway agent cannot store an enormous
/// blob. Setup scripts are a handful of shell lines; 64 KiB is generous headroom.
const MAX_SETUP_SCRIPT_BYTES: usize = 64 * 1024;

/// One repo's setup-script state, for the agent to read before it edits.
#[derive(Debug, Serialize)]
pub struct RepoSetupScript {
    pub id: Uuid,
    pub full_name: String,
    pub setup_script: String,
    /// Whether the script re-runs before every task, not just on first clone
    /// (issue #275). Tells the agent whether an edit takes effect next task.
    pub setup_script_always_run: bool,
    pub enabled: bool,
}

impl From<Repository> for RepoSetupScript {
    fn from(repo: Repository) -> Self {
        Self {
            id: repo.id,
            full_name: repo.full_name,
            setup_script: repo.setup_script,
            setup_script_always_run: repo.setup_script_always_run,
            enabled: repo.enabled,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct SetupScriptsResponse {
    /// The global environment setup, run once per workspace provision/recreate.
    pub base_setup_script: String,
    pub repos: Vec<RepoSetupScript>,
}

/// `GET /api/v1/agent/setup-scripts` - the current base + per-repo setup scripts,
/// so the agent can read what exists before proposing an edit.
pub async fn list(State(state): State<AppState>) -> ApiResult<Json<SetupScriptsResponse>> {
    let settings = queries::get_settings(&state.db).await?;
    let repos = queries::list_repositories(&state.db).await?;
    Ok(Json(SetupScriptsResponse {
        base_setup_script: settings.base_setup_script,
        repos: repos.into_iter().map(RepoSetupScript::from).collect(),
    }))
}

#[derive(Debug, Deserialize)]
pub struct UpdateRepoScriptRequest {
    /// The task being worked, so the change is attributed to it (audit trail).
    #[serde(default)]
    pub task_id: Option<Uuid>,
    /// The repo to edit: its `owner/name`, its short name, or its id.
    pub repo: String,
    pub setup_script: String,
    /// A one-line reason, shown to the operator so the change is explained.
    #[serde(default)]
    pub summary: String,
}

#[derive(Debug, Serialize)]
pub struct SetupScriptChangeResponse {
    /// The recorded change (before/after, target, summary), so the caller can
    /// confirm exactly what was stored.
    pub change: SetupScriptChange,
}

/// `POST /api/v1/agent/setup-scripts/repo` - replace a repo's `setup_script`.
///
/// Resolves the repo by id, `owner/name`, or unambiguous short name; a no-op edit
/// (unchanged script) is rejected so the audit log holds only real changes.
pub async fn update_repo(
    State(state): State<AppState>,
    Json(body): Json<UpdateRepoScriptRequest>,
) -> ApiResult<Response> {
    if body.setup_script.len() > MAX_SETUP_SCRIPT_BYTES {
        return Ok(bad_request(&format!(
            "setup_script is too large ({} bytes; max {MAX_SETUP_SCRIPT_BYTES})",
            body.setup_script.len()
        )));
    }

    let repos = queries::list_repositories(&state.db).await?;
    let repo = match resolve_repo(&repos, &body.repo) {
        RepoMatch::One(repo) => repo.clone(),
        RepoMatch::None => {
            return Ok(bad_request(&format!(
                "no repository matches '{}'. Use its owner/name or id (see the list tool).",
                body.repo
            )))
        }
        RepoMatch::Ambiguous => {
            return Ok(bad_request(&format!(
                "'{}' matches more than one repository; use the full owner/name or id.",
                body.repo
            )))
        }
    };

    if repo.setup_script == body.setup_script {
        return Ok(bad_request(
            "the setup script is unchanged; edit it to something different or leave it as is.",
        ));
    }

    let old_script = repo.setup_script.clone();
    let updated = queries::update_repo_setup_script(&state.db, repo.id, &body.setup_script).await?;
    let change = queries::record_setup_script_change(
        &state.db,
        body.task_id,
        "repo",
        Some(updated.id),
        Some(&updated.full_name),
        &old_script,
        &updated.setup_script,
        body.summary.trim(),
    )
    .await?;

    announce(&state, &change, &updated.full_name);
    Ok(Json(SetupScriptChangeResponse { change }).into_response())
}

#[derive(Debug, Deserialize)]
pub struct UpdateBaseScriptRequest {
    #[serde(default)]
    pub task_id: Option<Uuid>,
    pub setup_script: String,
    #[serde(default)]
    pub summary: String,
}

/// `POST /api/v1/agent/setup-scripts/base` - replace the global `base_setup_script`
/// (the environment setup). It takes effect on the next workspace provision/recreate.
pub async fn update_base(
    State(state): State<AppState>,
    Json(body): Json<UpdateBaseScriptRequest>,
) -> ApiResult<Response> {
    if body.setup_script.len() > MAX_SETUP_SCRIPT_BYTES {
        return Ok(bad_request(&format!(
            "setup_script is too large ({} bytes; max {MAX_SETUP_SCRIPT_BYTES})",
            body.setup_script.len()
        )));
    }

    let settings = queries::get_settings(&state.db).await?;
    if settings.base_setup_script == body.setup_script {
        return Ok(bad_request(
            "the base setup script is unchanged; edit it to something different or leave it as is.",
        ));
    }

    let old_script = settings.base_setup_script.clone();
    let updated = queries::update_base_setup_script(&state.db, &body.setup_script).await?;
    let change = queries::record_setup_script_change(
        &state.db,
        body.task_id,
        "base",
        None,
        None,
        &old_script,
        &updated.base_setup_script,
        body.summary.trim(),
    )
    .await?;

    announce(&state, &change, "environment setup");
    Ok(Json(SetupScriptChangeResponse { change }).into_response())
}

/// `POST /api/v1/setup-changes/:id/ack` - the operator dismisses a recorded change
/// once they have seen it, clearing it from the board banner.
pub async fn acknowledge(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<SetupScriptChange>> {
    let change = queries::acknowledge_setup_change(&state.db, id).await?;
    state.notify_board();
    Ok(Json(change))
}

/// Refreshes the board banner and fires the one-time toast + native notification.
fn announce(state: &AppState, change: &SetupScriptChange, target_label: &str) {
    // The banner (board payload) reflects the new unacknowledged change.
    state.notify_board();
    state.notify_setup_script_changed(
        change.task_id,
        target_label.to_string(),
        change.summary.clone(),
    );
}

fn bad_request(message: &str) -> Response {
    (StatusCode::BAD_REQUEST, Json(json!({ "error": message }))).into_response()
}

/// The outcome of resolving a user-supplied repo reference against the repo list.
enum RepoMatch<'a> {
    One(&'a Repository),
    None,
    Ambiguous,
}

/// Resolves a repo reference (`owner/name`, short name, or id) to a single repo.
///
/// An id or exact `owner/name` is unambiguous. A bare short name (the part after
/// `/`) resolves only when exactly one repo has it, else it is reported ambiguous
/// so the caller re-tries with the full name.
fn resolve_repo<'a>(repos: &'a [Repository], reference: &str) -> RepoMatch<'a> {
    let needle = reference.trim();
    if needle.is_empty() {
        return RepoMatch::None;
    }
    if let Ok(id) = Uuid::parse_str(needle) {
        return match repos.iter().find(|repo| repo.id == id) {
            Some(repo) => RepoMatch::One(repo),
            None => RepoMatch::None,
        };
    }
    if let Some(repo) = repos.iter().find(|repo| repo.full_name == needle) {
        return RepoMatch::One(repo);
    }
    let mut short_matches = repos
        .iter()
        .filter(|repo| repo.full_name.rsplit('/').next() == Some(needle));
    match (short_matches.next(), short_matches.next()) {
        (Some(repo), None) => RepoMatch::One(repo),
        (Some(_), Some(_)) => RepoMatch::Ambiguous,
        _ => RepoMatch::None,
    }
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{resolve_repo, RepoMatch};
    use crate::db::models::Repository;

    fn repo(id: Uuid, full_name: &str) -> Repository {
        // Only the fields `resolve_repo` reads matter; the rest use cheap defaults.
        Repository {
            id,
            railway_id: Uuid::nil(),
            full_name: full_name.to_string(),
            clone_url: String::new(),
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
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        }
    }

    #[test]
    fn resolves_by_id_full_name_and_unique_short_name() {
        let a = Uuid::from_u128(1);
        let b = Uuid::from_u128(2);
        let repos = vec![repo(a, "acme/web"), repo(b, "acme/api")];

        assert!(matches!(resolve_repo(&repos, "acme/web"), RepoMatch::One(r) if r.id == a));
        assert!(matches!(resolve_repo(&repos, &b.to_string()), RepoMatch::One(r) if r.id == b));
        // Unique short name resolves.
        assert!(matches!(resolve_repo(&repos, "api"), RepoMatch::One(r) if r.id == b));
        // Unknown reference is not found.
        assert!(matches!(
            resolve_repo(&repos, "acme/mobile"),
            RepoMatch::None
        ));
        assert!(matches!(resolve_repo(&repos, ""), RepoMatch::None));
    }

    #[test]
    fn ambiguous_short_name_across_owners_is_reported() {
        let a = Uuid::from_u128(1);
        let b = Uuid::from_u128(2);
        let repos = vec![repo(a, "acme/web"), repo(b, "other/web")];
        // "web" is ambiguous; the full owner/name still resolves each.
        assert!(matches!(resolve_repo(&repos, "web"), RepoMatch::Ambiguous));
        assert!(matches!(resolve_repo(&repos, "acme/web"), RepoMatch::One(r) if r.id == a));
        assert!(matches!(resolve_repo(&repos, "other/web"), RepoMatch::One(r) if r.id == b));
    }
}
