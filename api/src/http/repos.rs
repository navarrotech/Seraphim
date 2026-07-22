//! Repository configuration, issue sync, and org import.

use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use super::ApiResult;
use crate::db::models::{RepoDeletionImpact, ReposDeletionImpact, Repository, ReviewPolicy};
use crate::db::queries;
use crate::git;
use crate::orchestrator::provision::repo_dir_name;
use crate::orchestrator::repo_sync;
use crate::state::AppState;

/// `GET /api/v1/repos`
pub async fn list(State(state): State<AppState>) -> ApiResult<Json<Vec<Repository>>> {
    Ok(Json(queries::list_repositories(&state.db).await?))
}

/// Soft cap on seeded paths so a huge monorepo cannot return an unbounded payload.
/// runewood's `exclude` globs and `git ls-files` (which skips gitignored trees like
/// `node_modules` / `target`) already trim most noise (#216).
const MAX_TREE_PATHS: usize = 20_000;

/// The tracked-file list used to seed the watch page's activity forest (#216).
#[derive(Debug, Serialize)]
pub struct RepoTreeResponse {
    pub paths: Vec<String>,
}

/// `GET /api/v1/activity/tree`
///
/// Runs `git ls-files` in the workspace for every enabled repo and returns the
/// tracked paths, each prefixed with the repo's flat clone dir so the first path
/// segment is the repo, matching the live activity mapper (which strips
/// `/workspace/`). A repo that is not cloned, or whose exec fails, is skipped
/// rather than failing the whole request, so the forest still seeds from the rest.
pub async fn tree(State(state): State<AppState>) -> ApiResult<Json<RepoTreeResponse>> {
    let repos = queries::list_enabled_repositories(&state.db).await?;

    let mut paths = Vec::new();
    'repos: for repo in repos {
        let dir_name = repo_dir_name(&repo.full_name);
        let dir = format!("/workspace/{dir_name}");
        // `core.quotePath=false` keeps non-ascii paths literal instead of octal-escaped,
        // so they match the live event paths exactly.
        let command = vec![
            "git".to_string(),
            "-c".to_string(),
            "core.quotePath=false".to_string(),
            "ls-files".to_string(),
        ];

        let output = match state
            .workspace
            .exec_capture(&dir, command, Vec::new())
            .await
        {
            Ok(output) if output.succeeded() => output,
            Ok(output) => {
                tracing::debug!(
                    repo = %repo.full_name,
                    exit = output.exit_code,
                    "skipping repo tree: git ls-files failed (repo not cloned?)"
                );
                continue;
            }
            Err(error) => {
                tracing::debug!(repo = %repo.full_name, %error, "skipping repo tree: exec failed");
                continue;
            }
        };

        for line in output.output.lines() {
            let file = line.trim();
            if file.is_empty() {
                continue;
            }
            if paths.len() >= MAX_TREE_PATHS {
                tracing::debug!(cap = MAX_TREE_PATHS, "repo tree truncated at the path cap");
                break 'repos;
            }
            paths.push(format!("{dir_name}/{file}"));
        }
    }

    Ok(Json(RepoTreeResponse { paths }))
}

#[derive(Debug, Deserialize)]
pub struct UpsertRepoRequest {
    pub full_name: String,
    pub clone_url: String,
    #[serde(default = "default_branch")]
    pub default_branch: String,
    /// Per-repo override of the global branch template; omitted/blank inherits it.
    pub branch_template: Option<String>,
    #[serde(default)]
    pub setup_script: String,
    #[serde(default)]
    pub instructions: String,
    pub review_policy: Option<ReviewPolicy>,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub sync_issues: bool,
    #[serde(default)]
    pub issue_labels: Vec<String>,
    /// Re-run the repo's setup script before every task, not just on first clone
    /// (issue #275).
    #[serde(default)]
    pub setup_script_always_run: bool,
}

fn default_branch() -> String {
    "main".to_string()
}

/// A blank per-repo template means "inherit the global default", so normalize it
/// to `None` (matching how an omitted field deserializes).
fn branch_template_override(value: &Option<String>) -> Option<&str> {
    value
        .as_deref()
        .map(str::trim)
        .filter(|template| !template.is_empty())
}

fn default_true() -> bool {
    true
}

/// `POST /api/v1/repos` - create or update a repository by `full_name`.
pub async fn upsert(
    State(state): State<AppState>,
    Json(body): Json<UpsertRepoRequest>,
) -> ApiResult<Json<Repository>> {
    let repo = queries::upsert_repository(
        &state.db,
        &body.full_name,
        &body.clone_url,
        &body.default_branch,
        branch_template_override(&body.branch_template),
        &body.setup_script,
        &body.instructions,
        body.review_policy,
        body.enabled,
        body.sync_issues,
        &body.issue_labels,
        body.setup_script_always_run,
    )
    .await?;
    // Realtime: clone the added/enabled repo into the workspace now, in the
    // background (or queue its removal if it was disabled) (issue #343).
    repo_sync::sync_repos(&state, vec![repo.clone()]);
    state.notify_board();
    Ok(Json(repo))
}

/// `PUT /api/v1/repos/:id` - update a repository by id (rename-safe, so editing
/// the full name renames the row instead of creating a duplicate).
pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpsertRepoRequest>,
) -> ApiResult<Json<Repository>> {
    let repo = queries::update_repository(
        &state.db,
        id,
        &body.full_name,
        &body.clone_url,
        &body.default_branch,
        branch_template_override(&body.branch_template),
        &body.setup_script,
        &body.instructions,
        body.review_policy,
        body.enabled,
        body.sync_issues,
        &body.issue_labels,
        body.setup_script_always_run,
    )
    .await?;
    // Realtime: reconcile the workspace to the edited repo's state (issue #343).
    repo_sync::sync_repos(&state, vec![repo.clone()]);
    state.notify_board();
    Ok(Json(repo))
}

/// `GET /api/v1/repos/:id/deletion-impact` - what a delete would purge, so the
/// UI can spell it out before the user confirms.
pub async fn deletion_impact(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<RepoDeletionImpact>> {
    Ok(Json(queries::repo_deletion_impact(&state.db, id).await?))
}

/// `DELETE /api/v1/repos/:id` - delete the repo and everything synced from it.
pub async fn delete(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<serde_json::Value>> {
    // Capture the row before deleting so we can remove its workspace clone; the
    // row (and its railway/name) is gone after the delete (issue #343).
    let removed = queries::get_repository(&state.db, id).await?;
    queries::delete_repository(&state.db, id).await?;
    if let Some(repo) = removed {
        repo_sync::queue_removals(&state, &[repo]);
    }
    state.notify_board();
    Ok(Json(json!({ "deleted": true })))
}

// --- Bulk edit (repositories multi-select, issue #331) -----------------------
//
// Back the repositories page's multi-select bar, mirroring the board's bulk edit.
// Each takes a set of repo ids and notifies the board once at the end.

#[derive(Debug, Deserialize)]
pub struct BulkRepoIdsRequest {
    pub ids: Vec<Uuid>,
}

/// `POST /api/v1/repos/bulk/deletion-impact` - aggregate what deleting a set of
/// repos would purge, so the UI can spell it out before the user confirms.
pub async fn bulk_deletion_impact(
    State(state): State<AppState>,
    Json(body): Json<BulkRepoIdsRequest>,
) -> ApiResult<Json<ReposDeletionImpact>> {
    Ok(Json(
        queries::repos_deletion_impact(&state.db, &body.ids).await?,
    ))
}

#[derive(Debug, Deserialize)]
pub struct BulkRepoFieldsRequest {
    pub ids: Vec<Uuid>,
    /// Each is `None` ("keep as is") or `Some(value)` to set across the selection.
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub sync_issues: Option<bool>,
}

/// `POST /api/v1/repos/bulk/fields` - set `enabled` and/or `sync_issues` across a
/// selection of repos. Omitted fields are left untouched.
pub async fn bulk_fields(
    State(state): State<AppState>,
    Json(body): Json<BulkRepoFieldsRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let updated =
        queries::bulk_set_repo_fields(&state.db, &body.ids, body.enabled, body.sync_issues).await?;
    // Realtime: an `enabled` flip clones the newly-enabled repos or queues the
    // disabled ones for removal (issue #343). Skip when only `sync_issues` changed.
    if body.enabled.is_some() {
        let affected = queries::list_repositories_by_ids(&state.db, &body.ids).await?;
        repo_sync::sync_repos(&state, affected);
    }
    state.notify_board();
    Ok(Json(json!({ "updated": updated })))
}

/// `POST /api/v1/repos/bulk/delete` - delete a selection of repos and everything
/// synced from them.
pub async fn bulk_delete(
    State(state): State<AppState>,
    Json(body): Json<BulkRepoIdsRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    // Capture the rows before deleting so their workspace clones can be removed
    // between tasks (issue #343).
    let removed = queries::list_repositories_by_ids(&state.db, &body.ids).await?;
    let deleted = queries::delete_repositories(&state.db, &body.ids).await?;
    repo_sync::queue_removals(&state, &removed);
    state.notify_board();
    Ok(Json(json!({ "deleted": deleted })))
}

#[derive(Debug, Deserialize)]
pub struct ImportOrgRequest {
    pub owner: String,
    /// Optional label filter applied to every imported repo's issue sync.
    #[serde(default)]
    pub issue_labels: Vec<String>,
}

/// `POST /api/v1/repos/import-org` - discover every repo under an org/user and
/// add the ones we don't already track (issue-syncing on, your org defaults).
pub async fn import_org(
    State(state): State<AppState>,
    Json(body): Json<ImportOrgRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let github = state.github().await?;
    let discovered = git::list_org_repos(&github, &body.owner).await?;

    let mut imported = 0_usize;
    let mut added = Vec::new();
    for repo in &discovered {
        let existed = queries::get_repository_by_full_name(&state.db, &repo.full_name)
            .await?
            .is_some();
        // Newly discovered repos inherit the global branch template (override later).
        let created = queries::create_repository_if_absent(
            &state.db,
            &repo.full_name,
            &repo.clone_url,
            &repo.default_branch,
            None,
            true,
            &body.issue_labels,
        )
        .await?;
        if !existed {
            imported += 1;
            added.push(created);
        }
    }

    // Realtime: clone every newly-imported repo into the workspace now, in the
    // background, so a big org import lands immediately (issue #343).
    repo_sync::sync_repos(&state, added);
    state.notify_board();
    Ok(Json(json!({
        "discovered": discovered.len(),
        "imported": imported,
    })))
}

/// `POST /api/v1/sync` - run an immediate issue sync ("Check issues").
pub async fn sync(State(state): State<AppState>) -> ApiResult<Json<serde_json::Value>> {
    crate::orchestrator::sync_once(&state).await?;
    Ok(Json(json!({ "status": "synced" })))
}
