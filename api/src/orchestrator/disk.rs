//! Pre-turn workspace disk guard (issue #390).
//!
//! `/workspace` is one volume shared across every sibling repo, so a single
//! Rust-heavy repo whose incremental `target/` grows over many rebuilds (crew
//! reached 21G in one incident) can fill the disk and starve every other task on
//! the box. A full disk does not announce itself: it surfaces as a misleading
//! `cc: No space left on device` link error that looks like a code failure,
//! which can burn CI-fix attempts and even push a task to `ci_blocked` for a
//! cause that has nothing to do with the code.
//!
//! Before each turn [`guard_workspace_disk`] measures the free space and:
//!
//! - proceeds untouched when there is ample room;
//! - reclaims stale Rust `target/` dirs (a `cargo clean`, worth ~20G in the crew
//!   incident) when the free space dips below [`RECLAIM_BELOW_BYTES`], since a
//!   clean rebuild is only a few GB;
//! - refuses the turn with a loud, unambiguous "workspace disk full" error when
//!   even that leaves less than [`HARD_FLOOR_BYTES`], so the operator sees the
//!   real cause (a shared-volume disk problem) instead of a masqueraded link
//!   error.
//!
//! The refusal rides the normal turn-abort path, so it lands as a `heart_attacks`
//! incident with a board banner and a notification rather than a silent stall.

use eyre::{eyre, Context, Result};
use tracing::{info, warn};

use super::railway::RailwayHandle;
use crate::state::AppState;

/// The one shared volume every railway's repos are cloned under.
const WORKSPACE_ROOT: &str = "/workspace";

/// Bytes per gibibyte, so the thresholds below read in the units operators use.
const GIB: u64 = 1024 * 1024 * 1024;

/// Free space below which stale Rust `target/` dirs are pruned before the turn.
///
/// Set above the largest realistic clean build (a from-scratch crew build is
/// ~4-8G) so pruning restores enough headroom for the turn's own compiles, yet
/// low enough that it fires only when a bloated `target/` is the actual cause,
/// not on every turn. Reclaiming forces the next build to compile from scratch,
/// so it must stay rare; raise this only if turns routinely run the disk down
/// between the reclaim floor and here.
const RECLAIM_BELOW_BYTES: u64 = 10 * GIB;

/// Free space below which the turn is refused rather than run into a misleading
/// link failure.
///
/// A compile needs more than this, so proceeding would only produce a `No space
/// left on device` error misattributed to the code. Kept well under
/// [`RECLAIM_BELOW_BYTES`] so a reclaim gets the chance to recover the disk
/// before the turn is refused.
const HARD_FLOOR_BYTES: u64 = 2 * GIB;

// A reclaim must get the chance to recover the disk before the turn is refused,
// so the floor is strictly the lower of the two thresholds. Enforced at compile
// time, since both are constants.
const _: () = assert!(HARD_FLOOR_BYTES < RECLAIM_BELOW_BYTES);

/// The marker `free_bytes` tags the `df` figure with, so parsing survives any
/// shell-profile or `git`-helper noise the exec's combined output carries.
const AVAIL_MARKER: &str = "SERAPHIM_AVAIL_KB:";

/// Ensures `/workspace` has room for the turn, reclaiming stale build artifacts
/// and refusing loudly when the disk is genuinely full (issue #390).
///
/// # Errors
///
/// Returns an error when the free space stays below [`HARD_FLOOR_BYTES`] even
/// after reclaiming, so the caller aborts the turn with a clear disk-full cause
/// instead of letting the agent hit a masqueraded link error. A failure to read
/// the free space is surfaced the same way rather than silently skipped, since a
/// guard that cannot measure the disk is not guarding it.
pub async fn guard_workspace_disk(state: &AppState, handle: &RailwayHandle) -> Result<()> {
    let free = free_bytes(state, handle).await?;
    if free >= RECLAIM_BELOW_BYTES {
        return Ok(());
    }

    warn!(
        free_bytes = free,
        "workspace disk low; pruning stale Rust target dirs before the turn"
    );
    prune_rust_target_dirs(state, handle).await;

    let free_after = free_bytes(state, handle).await?;
    if free_after < HARD_FLOOR_BYTES {
        return Err(eyre!(
            "workspace disk full: only {}G free on {WORKSPACE_ROOT} after reclaiming build \
             artifacts (a build needs at least {}G). Free space on the shared workspace volume, \
             then retry: this is a disk problem, not a code failure.",
            gib(free_after),
            gib(HARD_FLOOR_BYTES),
        ));
    }

    info!(
        free_bytes = free_after,
        reclaimed_bytes = free_after.saturating_sub(free),
        "reclaimed workspace disk space before the turn"
    );
    Ok(())
}

/// Reads the free bytes on the workspace volume via `df` inside the container.
///
/// `df -Pk` prints the POSIX one-line-per-filesystem format whose fourth column
/// is the available space in 1K blocks; `awk` tags that figure with
/// [`AVAIL_MARKER`] so [`parse_avail_bytes`] can pick it out of the combined
/// stdout/stderr the exec returns.
async fn free_bytes(state: &AppState, handle: &RailwayHandle) -> Result<u64> {
    let script = format!("df -Pk {WORKSPACE_ROOT} | awk 'NR==2 {{print \"{AVAIL_MARKER}\" $4}}'");
    let output = state
        .workspace
        .exec_capture_in(
            handle.container(),
            WORKSPACE_ROOT,
            vec!["bash".to_string(), "-c".to_string(), script],
            Vec::new(),
        )
        .await
        .wrap_err("failed to run df in the workspace container")?;
    if !output.succeeded() {
        return Err(eyre!(
            "df exited {} while checking the workspace disk: {}",
            output.exit_code,
            output.output.trim()
        ));
    }
    parse_avail_bytes(&output.output)
}

/// Extracts the available bytes from `free_bytes`'s marked `df` output. Pure, so
/// the parsing is unit-tested against real and malformed `df` shapes.
fn parse_avail_bytes(output: &str) -> Result<u64> {
    let kib = output
        .lines()
        .find_map(|line| line.trim().strip_prefix(AVAIL_MARKER))
        .ok_or_else(|| eyre!("df output missing the {AVAIL_MARKER} marker: {output:?}"))?
        .trim()
        .parse::<u64>()
        .wrap_err_with(|| format!("df available figure was not a number: {output:?}"))?;
    Ok(kib * 1024)
}

/// Removes every top-level repo's Rust `target/` dir to reclaim disk, best
/// effort.
///
/// Runs between turns (before the turn execs), so no build is in flight. It
/// finds each `Cargo.toml` up to three levels deep (a repo's root crate at
/// `/workspace/{repo}` or a nested one at `/workspace/{repo}/{crate}`) and drops
/// the `target/` beside it, pruning `target`, `node_modules`, and `.git` from
/// the walk so it neither descends the very dirs it clears nor trips on a
/// vendored manifest. Guarding on `Cargo.toml` keeps a non-Rust `target` dir
/// safe. Best effort: a reclaim failure is logged, and the caller's re-measure
/// still decides whether the turn may proceed.
async fn prune_rust_target_dirs(state: &AppState, handle: &RailwayHandle) {
    let script = format!(
        "find {WORKSPACE_ROOT} -maxdepth 3 \\( -name target -o -name node_modules -o -name .git \\) \
         -prune -o -type f -name Cargo.toml -print 2>/dev/null | \
         while IFS= read -r manifest; do \
           target=\"$(dirname \"$manifest\")/target\"; \
           [ -d \"$target\" ] && rm -rf \"$target\"; \
         done"
    );
    match state
        .workspace
        .exec_capture_in(
            handle.container(),
            WORKSPACE_ROOT,
            vec!["bash".to_string(), "-c".to_string(), script],
            Vec::new(),
        )
        .await
    {
        Ok(output) if output.succeeded() => {}
        Ok(output) => warn!(
            exit = output.exit_code,
            output = %output.output.trim(),
            "pruning workspace target dirs reported an error"
        ),
        Err(error) => warn!(error = %error, "failed to prune workspace target dirs"),
    }
}

/// Bytes rendered as gibibytes to one decimal, for human-readable error text.
///
/// Integer arithmetic (not a float cast) keeps the figure exact to the tenth,
/// so "1.8" never drifts to "1.7999".
fn gib(bytes: u64) -> String {
    format!("{}.{}", bytes / GIB, (bytes % GIB) * 10 / GIB)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_available_bytes_from_marked_df_output() {
        // `df -Pk` reports 1K blocks; the marker carries the fourth column.
        let output = "SERAPHIM_AVAIL_KB:20971520\n";
        assert_eq!(parse_avail_bytes(output).unwrap(), 20 * GIB);
    }

    #[test]
    fn ignores_shell_profile_noise_before_the_marker() {
        // A login shell or the git-credential helper may print ahead of df; the
        // marker still pins the figure.
        let output = "some profile banner\ngh auth noise\nSERAPHIM_AVAIL_KB:1048576\n";
        assert_eq!(parse_avail_bytes(output).unwrap(), GIB);
    }

    #[test]
    fn errors_when_the_marker_is_absent() {
        // A df that failed to match (e.g. an empty mount table) must be an error,
        // not a silent zero that would trip the hard floor spuriously.
        assert!(parse_avail_bytes("df: /workspace: No such file or directory\n").is_err());
    }

    #[test]
    fn errors_when_the_figure_is_not_a_number() {
        assert!(parse_avail_bytes("SERAPHIM_AVAIL_KB:not-a-number\n").is_err());
    }

    #[test]
    fn renders_gibibytes_to_one_decimal() {
        assert_eq!(gib(2 * GIB), "2.0");
        // 1.5 GiB, exact to the tenth with no float drift.
        assert_eq!(gib(GIB + GIB / 2), "1.5");
    }
}
