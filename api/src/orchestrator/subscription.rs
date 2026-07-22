//! Subscription usage-gauge keepalive loop.
//!
//! Token lifecycle (refresh ahead of expiry, rotation) now lives in
//! [`crate::orchestrator::credentials`]; this loop's job is the subscription usage
//! gauge. Every tick it resolves the active credential (which refreshes its OAuth
//! token if needed, keeping it warm for the next turn) and, when that credential is
//! a subscription OAuth login whose consent granted `user:profile`, polls
//! `/api/oauth/usage` for the gauge. Other kinds (a pasted setup-token, an API key)
//! report no usage, so the gauge is cleared.

use std::time::Duration;

use eyre::{eyre, Result};
use tokio::time::sleep;
use tracing::debug;

use crate::claude::oauth;
use crate::db::models::CredentialKind;
use crate::orchestrator::credentials;
use crate::state::{AppState, SubscriptionUsage};

/// How often the gauge is polled (and the active token kept warm). Deliberately
/// infrequent: `/api/oauth/usage` returns 429 under even modest polling, and the
/// token only needs refreshing every several hours, so five minutes is ample.
const KEEPALIVE_POLL: Duration = Duration::from_secs(300);

/// The scope required to read `/api/oauth/usage`. The subscription consent grants
/// `user:profile user:inference`; a pasted setup-token has no scopes, so its gauge
/// is skipped.
const USAGE_SCOPE: &str = "user:profile";

/// Keeps the active subscription token warm and polls the usage gauge, forever.
pub async fn token_loop(state: AppState) {
    loop {
        if let Err(error) = keepalive_once(&state).await {
            // A failed refresh surfaces here promptly (before the next turn needs
            // it); transient poll failures are benign and leave the last snapshot.
            debug!(error = %error, "Claude subscription keepalive tick failed");
        }
        sleep(KEEPALIVE_POLL).await;
    }
}

async fn keepalive_once(state: &AppState) -> Result<()> {
    // Resolving the active credential refreshes its OAuth token ahead of expiry, so
    // the next turn (or the first after a long idle) never blocks on a refresh.
    let Some(active) = credentials::active_credential(state).await? else {
        // No usable credential: clear any stale gauge snapshot.
        state.set_usage(None);
        return Ok(());
    };

    // Only a subscription OAuth login with the profile scope can report usage.
    if active.kind != CredentialKind::SubscriptionOauth || !active.scopes.contains(USAGE_SCOPE) {
        state.set_usage(None);
        return Ok(());
    }

    let usage = oauth::fetch_usage(&active.token)
        .await
        .map_err(|error| eyre!("usage poll skipped: {error}"))?;
    state.set_usage(Some(SubscriptionUsage {
        five_hour_utilization: usage.five_hour_utilization,
        five_hour_resets_at: usage.five_hour_resets_at,
        seven_day_utilization: usage.seven_day_utilization,
        seven_day_resets_at: usage.seven_day_resets_at,
    }));
    Ok(())
}
