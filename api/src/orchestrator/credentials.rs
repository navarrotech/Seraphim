//! Multiple Claude credentials with priority rotation (issue #341).
//!
//! The agent runs on the highest-priority *available* credential (enabled, has a
//! secret, not currently exhausted). When a turn hits its usage limit the active
//! credential is marked exhausted and the next turn picks the next credential;
//! only when EVERY credential is exhausted does the whole agent pause, until the
//! soonest one frees up. This replaces the old single-credential-on-the-settings-row
//! model and its "hitting a limit pauses everything" behavior.
//!
//! The schema is provider-agnostic (a `base_url` per credential routes a
//! non-Anthropic provider through the `LiteLLM` sidecar, issue #342), so the same
//! rotation drives any future LLM; today every credential is Anthropic.

use chrono::{DateTime, Utc};
use eyre::{eyre, Context, Result};
use tracing::{info, warn};
use uuid::Uuid;

use crate::claude::oauth;
use crate::db::models::{CredentialKind, LlmCredential};
use crate::db::queries;
use crate::state::AppState;

/// Refresh a subscription OAuth access token this many minutes before it expires,
/// so a turn never blocks on (or briefly runs past) an expiry.
const REFRESH_SKEW_MINUTES: i64 = 10;

/// How long to sideline a credential whose OAuth refresh just failed, so the loop
/// tries the next credential now and retries this one later instead of hot-looping
/// on a dead refresh token. The operator sees the reason on the LLMs page.
const REFRESH_FAILURE_COOLDOWN_MINUTES: i64 = 30;

/// The resolved credential a turn runs on: the ready-to-use inference token plus the
/// routing/identity the exec and the usage gauge need.
#[derive(Debug, Clone)]
pub struct ActiveCredential {
    pub id: Uuid,
    pub kind: CredentialKind,
    /// The inference credential, refreshed if it was a near-expiry OAuth token.
    pub token: String,
    /// Anthropic-compatible base URL (`ANTHROPIC_BASE_URL`); empty = Anthropic direct.
    pub base_url: String,
    /// OAuth scopes (space-separated); `user:profile` authorizes the usage gauge.
    pub scopes: String,
}

/// The highest-priority usable credential, refreshing its OAuth token if needed, or
/// `None` when no credential is currently usable (none configured, all disabled, or
/// all exhausted). Every turn resolves its auth here.
pub async fn active_credential(state: &AppState) -> Result<Option<ActiveCredential>> {
    let now = Utc::now();
    let credentials = queries::list_llm_credentials(&state.db).await?;
    for credential in credentials {
        if !credential.is_available(now) {
            continue;
        }
        let Some(kind) = credential.parsed_kind() else {
            warn!(id = %credential.id, kind = %credential.kind, "skipping credential with an unknown kind");
            continue;
        };
        // Subscription OAuth refreshes its short-lived access token ahead of expiry;
        // the other kinds run on their stored secret verbatim.
        let token = if kind.refreshes_oauth() && !credential.oauth_refresh_token.is_empty() {
            match ensure_fresh_token(state, &credential, now).await {
                Ok(token) => token,
                Err(error) => {
                    // A dead refresh token: sideline this credential briefly (so we
                    // move to the next one now and retry it later) and continue.
                    warn!(id = %credential.id, %error, "credential refresh failed; sidelining it");
                    let until = now + chrono::Duration::minutes(REFRESH_FAILURE_COOLDOWN_MINUTES);
                    let _ = queries::set_credential_exhausted(
                        &state.db,
                        credential.id,
                        until,
                        "OAuth refresh failed; reconnect this subscription in Settings -> LLMs",
                    )
                    .await;
                    continue;
                }
            }
        } else {
            credential.secret.clone()
        };
        return Ok(Some(ActiveCredential {
            id: credential.id,
            kind,
            token,
            base_url: credential.base_url,
            scopes: credential.oauth_scopes,
        }));
    }
    Ok(None)
}

/// Whether a subscription OAuth access token has expired or is within the refresh
/// skew of expiry. A missing expiry is treated as "refresh now".
fn is_near_expiry(expires_at: Option<DateTime<Utc>>, now: DateTime<Utc>) -> bool {
    expires_at.is_none_or(|expires_at| {
        expires_at <= now + chrono::Duration::minutes(REFRESH_SKEW_MINUTES)
    })
}

/// Refreshes the credential's OAuth access token when it is missing or near expiry,
/// persisting the rotated pair; returns a usable access token. Serialized on the
/// global refresh lock so two turns never rotate a token concurrently.
async fn ensure_fresh_token(
    state: &AppState,
    credential: &LlmCredential,
    now: DateTime<Utc>,
) -> Result<String> {
    if !is_near_expiry(credential.oauth_expires_at, now)
        && !credential.oauth_access_token.is_empty()
    {
        return Ok(credential.secret.clone());
    }
    let _guard = state.claude_token_refresh().lock().await;
    // Re-read under the lock: another turn may have already refreshed it.
    let latest = queries::get_llm_credential(&state.db, credential.id)
        .await?
        .ok_or_else(|| eyre!("credential was deleted during refresh"))?;
    if !is_near_expiry(latest.oauth_expires_at, Utc::now()) && !latest.oauth_access_token.is_empty()
    {
        return Ok(latest.secret);
    }
    let tokens = oauth::refresh(&latest.oauth_refresh_token).await.wrap_err(
        "refreshing the Claude subscription token failed; the refresh token may be \
         expired or revoked",
    )?;
    let expires_at = Utc::now() + chrono::Duration::seconds(tokens.expires_in);
    queries::set_credential_oauth_tokens(
        &state.db,
        credential.id,
        &tokens.access_token,
        &tokens.refresh_token,
        expires_at,
        &tokens.account_email,
    )
    .await?;
    info!(id = %credential.id, expires_in = tokens.expires_in, "refreshed a Claude subscription token");
    Ok(tokens.access_token)
}

/// Marks the active credential exhausted until its window `reset`, then reconciles
/// the global pause. If another credential is available the agent rotates to it (the
/// pause is cleared); if every credential is now exhausted the agent pauses until the
/// soonest reset. Returns `true` when it rotated, `false` when it paused.
pub async fn mark_exhausted_and_reconcile(
    state: &AppState,
    credential_id: Uuid,
    reset: DateTime<Utc>,
    reason: &str,
) -> Result<bool> {
    queries::set_credential_exhausted(&state.db, credential_id, reset, reason).await?;
    reconcile_pause(state).await
}

/// Sets or clears `settings.usage_paused_until` from the current credential state:
/// if any credential is available now, clears the pause (the agent keeps going on
/// the next credential); otherwise pauses until the soonest credential frees.
/// Returns whether a credential is available.
pub async fn reconcile_pause(state: &AppState) -> Result<bool> {
    let now = Utc::now();
    let credentials = queries::list_llm_credentials(&state.db).await?;
    if credentials
        .iter()
        .any(|credential| credential.is_available(now))
    {
        queries::set_usage_paused_until(&state.db, None).await?;
        state.notify_board();
        return Ok(true);
    }
    // Every credential is exhausted or disabled: pause until the soonest one resets
    // (None when none is on an exhaustion timer, e.g. all simply disabled).
    let reset = queries::earliest_credential_reset(&state.db).await?;
    queries::set_usage_paused_until(&state.db, reset).await?;
    state.notify_board();
    Ok(false)
}

/// A masked summary of the active credential, for the board header (issue #269's
/// account-email display, now sourced from whichever credential is in use).
#[derive(Debug, Clone, serde::Serialize)]
pub struct ActiveCredentialSummary {
    pub id: Uuid,
    pub kind: String,
    pub label: String,
    pub account_email: String,
}

/// The active credential summary for the settings/board payload, or `None` when no
/// credential is usable. Does not refresh tokens (a cheap read for the board), so it
/// picks the top available credential by priority without touching the network.
pub async fn active_summary(state: &AppState) -> Result<Option<ActiveCredentialSummary>> {
    let now = Utc::now();
    let credentials = queries::list_llm_credentials(&state.db).await?;
    Ok(credentials
        .into_iter()
        .find(|credential| credential.is_available(now))
        .map(|credential| ActiveCredentialSummary {
            id: credential.id,
            kind: credential.kind,
            label: credential.label,
            account_email: credential.account_email,
        }))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn credential(
        position: f64,
        enabled: bool,
        secret: &str,
        exhausted_until: Option<DateTime<Utc>>,
    ) -> LlmCredential {
        LlmCredential {
            // The id is irrelevant to these tests (they check ordering/availability),
            // so a fixed nil id keeps the fixture free of a lossy float-to-int cast.
            id: Uuid::nil(),
            provider: "anthropic".into(),
            kind: "subscription_oauth".into(),
            label: String::new(),
            position,
            enabled,
            secret: secret.into(),
            oauth_access_token: String::new(),
            oauth_refresh_token: String::new(),
            oauth_expires_at: None,
            oauth_scopes: String::new(),
            account_email: String::new(),
            base_url: String::new(),
            exhausted_until,
            last_error: None,
        }
    }

    #[test]
    fn availability_requires_enabled_secret_and_not_exhausted() {
        let now = Utc::now();
        assert!(credential(0.0, true, "tok", None).is_available(now));
        // Disabled, empty secret, and a future exhaustion each make it unavailable.
        assert!(!credential(0.0, false, "tok", None).is_available(now));
        assert!(!credential(0.0, true, "", None).is_available(now));
        assert!(
            !credential(0.0, true, "tok", Some(now + chrono::Duration::hours(1))).is_available(now)
        );
        // A past exhaustion has reset, so it is available again.
        assert!(
            credential(0.0, true, "tok", Some(now - chrono::Duration::minutes(1)))
                .is_available(now)
        );
    }

    #[test]
    fn priority_picks_the_first_available_in_order() {
        let now = Utc::now();
        // #1 exhausted, #2 disabled, #3 available -> pick #3.
        let creds = [
            credential(0.0, true, "a", Some(now + chrono::Duration::hours(1))),
            credential(1000.0, false, "b", None),
            credential(2000.0, true, "c", None),
        ];
        let picked = creds.iter().position(|c| c.is_available(now));
        assert_eq!(picked, Some(2));
    }

    #[test]
    fn near_expiry_covers_missing_past_and_within_skew() {
        let now = Utc::now();
        assert!(is_near_expiry(None, now));
        assert!(is_near_expiry(Some(now - chrono::Duration::days(1)), now));
        assert!(is_near_expiry(
            Some(now + chrono::Duration::minutes(REFRESH_SKEW_MINUTES - 1)),
            now
        ));
        assert!(!is_near_expiry(Some(now + chrono::Duration::hours(4)), now));
    }
}
