//! Build script: rebuild whenever the SQL migrations change (issue #377).
//!
//! `sqlx::migrate!("./migrations")` embeds the migration set at compile time,
//! but adding a `.sql` file touches no `.rs` source, so cargo may skip
//! recompiling the crate. `cargo run --bin migrate` (and the API's own
//! boot-time migrate) would then silently apply a STALE list, stopping short of
//! the newly added migration until some `.rs` file is force-touched.
//!
//! Emitting `rerun-if-changed=migrations` ties the crate's freshness to that
//! directory, so a new or edited migration always rebuilds the embedded set.
//! Local runs and the CI "Migrate (throwaway Postgres)" step then never test a
//! stale migration list.

fn main() {
    // A directory path: cargo scans it recursively, so both a new file and an
    // edit to an existing migration invalidate the build and re-embed the set.
    println!("cargo:rerun-if-changed=migrations");
}
