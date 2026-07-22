//! Realtime add/remove of repos in the workspace (issue #343).
//!
//! Adding a repo clones it into the workspace immediately, in the background, so a
//! freshly-added repo lands without waiting for the next full provision (the bug the
//! issue reports: "we added a lot of repos and nothing happened"). The clone runs as
//! its own `docker exec` on a new directory, so it never blocks the HTTP response
//! and never disrupts the agent's in-flight turn (a different repo dir).
//!
//! Removing a repo is deferred: the clone dir is queued and `rm -rf`'d by the
//! railway's agent loop BETWEEN tasks, so the agent's work is never interrupted.

use tracing::{info, warn};

use crate::db::models::Repository;
use crate::docker::ContainerState;
use crate::state::AppState;

use super::provision;
use super::railway::{self, RailwayHandle};

/// Reconciles the workspace to a set of just-mutated repos (issue #343): the enabled
/// ones are cloned into their railway in the background; the disabled ones have their
/// clone dir queued for removal between tasks. One call handles the add, edit, and
/// enable/disable paths uniformly by converging each repo to its desired state.
pub fn sync_repos(state: &AppState, repos: Vec<Repository>) {
    // A disabled repo should not sit in the workspace (a full provision only clones
    // enabled repos), so queue its clone dir for removal.
    for repo in repos.iter().filter(|repo| !repo.enabled) {
        state.queue_repo_removal(
            repo.railway_id,
            provision::repo_dir_name(&repo.full_name).to_string(),
        );
    }

    let to_clone: Vec<Repository> = repos.into_iter().filter(|repo| repo.enabled).collect();
    if to_clone.is_empty() {
        return;
    }

    // Clone in one background task, sequentially, so importing an org of dozens of
    // repos does not fan out into dozens of concurrent clones.
    let state = state.clone();
    tokio::spawn(async move {
        for repo in to_clone {
            if let Err(error) = clone_one(&state, &repo).await {
                warn!(repo = %repo.full_name, %error, "background repo clone failed");
            }
        }
    });
}

/// Queues the given (typically just-deleted) repos' clone dirs for removal between
/// tasks. Deleted repos are gone from the DB, so the caller passes the rows it
/// captured before the delete.
pub fn queue_removals(state: &AppState, repos: &[Repository]) {
    for repo in repos {
        state.queue_repo_removal(
            repo.railway_id,
            provision::repo_dir_name(&repo.full_name).to_string(),
        );
    }
}

/// Clones one repo into its railway's container, but only when that container is
/// already running: `main`'s always is, and a stopped non-`main` railway will clone
/// the repo on its next provision (`ensure_running`), so there is no need to spin a
/// container up just to pre-clone.
async fn clone_one(state: &AppState, repo: &Repository) -> eyre::Result<()> {
    let handle = railway::handle_for(state, repo.railway_id).await?;
    if !container_running(state, &handle).await? {
        return Ok(());
    }
    provision::clone_repo(state, &handle, repo).await?;
    info!(repo = %repo.full_name, "cloned a newly-added repo into the workspace");
    Ok(())
}

/// Applies a railway's queued repo removals, called by the agent loop between tasks
/// (issue #343). Only removes from a running container (never starts one just to
/// clean up); on failure the dirs are re-queued so the next tick retries.
pub async fn apply_pending_removals(state: &AppState, handle: &RailwayHandle) {
    match container_running(state, handle).await {
        Ok(true) => {}
        // Stopped/absent: leave the dirs queued until the container is next running.
        Ok(false) => return,
        Err(error) => {
            warn!(error = %error, railway_id = %handle.id, "could not check container state for repo removal");
            return;
        }
    }

    let dirs = state.take_pending_removals(handle.id);
    if dirs.is_empty() {
        return;
    }
    match provision::remove_repo_dirs(state, handle, &dirs).await {
        Ok(()) => {
            info!(count = dirs.len(), railway_id = %handle.id, "removed queued repo clone dirs between tasks")
        }
        Err(error) => {
            warn!(error = %error, railway_id = %handle.id, "failed to remove queued repo clone dirs; re-queuing");
            for dir in dirs {
                state.queue_repo_removal(handle.id, dir);
            }
        }
    }
}

/// Whether a railway's container is currently running (so an exec would succeed).
async fn container_running(state: &AppState, handle: &RailwayHandle) -> eyre::Result<bool> {
    Ok(state.workspace.container_state(handle.container()).await? == ContainerState::Running)
}
