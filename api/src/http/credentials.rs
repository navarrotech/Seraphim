//! Multiple Claude credentials with priority rotation (issue #341).
//!
//! Backs the Settings -> LLMs subpage: list the priority-ordered credentials, add a
//! new one (a subscription OAuth login, a pasted setup-token, or an API key),
//! reorder them by drag-and-drop, edit a label / enable flag, and delete. The raw
//! secrets never leave the database; the list returns masked [`LlmCredentialView`]s.
//!
//! The agent runs on the highest-priority available credential and rotates to the
//! next when one is rate-limited; that logic lives in
//! [`crate::orchestrator::credentials`].

use axum::extract::{Path, State};
use axum::Json;
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use super::ApiResult;
use crate::db::models::{CredentialKind, LlmCredentialView};
use crate::db::queries;
use crate::orchestrator;
use crate::secrets::mask;
use crate::state::AppState;

/// Builds the masked, priority-ordered view of the stored credentials, marking the
/// one the agent is currently running on (the highest-priority available one).
async fn list_views(state: &AppState) -> ApiResult<Vec<LlmCredentialView>> {
    let now = Utc::now();
    let credentials = queries::list_llm_credentials(&state.db).await?;
    // The active credential is simply the first available one in priority order.
    let active_id = credentials
        .iter()
        .find(|credential| credential.is_available(now))
        .map(|credential| credential.id);
    let views = credentials
        .into_iter()
        .map(|credential| {
            let available = credential.is_available(now);
            LlmCredentialView {
                id: credential.id,
                provider: credential.provider,
                kind: credential.kind,
                label: credential.label,
                position: credential.position,
                enabled: credential.enabled,
                token_preview: (!credential.secret.is_empty()).then(|| mask(&credential.secret)),
                account_email: credential.account_email,
                base_url: credential.base_url,
                // Only surface an exhaustion that is still in the future.
                exhausted_until: credential.exhausted_until.filter(|until| *until > now),
                last_error: credential.last_error,
                available,
                active: active_id == Some(credential.id),
            }
        })
        .collect();
    Ok(views)
}

/// `GET /api/v1/credentials` - the priority-ordered credential list (masked).
pub async fn list(State(state): State<AppState>) -> ApiResult<Json<Vec<LlmCredentialView>>> {
    Ok(Json(list_views(&state).await?))
}

#[derive(Debug, Deserialize)]
pub struct ReorderRequest {
    /// Credential ids in the new priority order (first = highest priority).
    pub ids: Vec<Uuid>,
}

/// `POST /api/v1/credentials/reorder` - set the priority order from a drag-drop.
pub async fn reorder(
    State(state): State<AppState>,
    Json(body): Json<ReorderRequest>,
) -> ApiResult<Json<Vec<LlmCredentialView>>> {
    queries::reorder_llm_credentials(&state.db, &body.ids).await?;
    // A reorder can change which credential is active; refresh the board header.
    orchestrator::credentials::reconcile_pause(&state).await?;
    Ok(Json(list_views(&state).await?))
}

#[derive(Debug, Serialize)]
pub struct OauthStartResponse {
    /// The consent URL to open in a new tab.
    pub authorize_url: String,
}

/// `POST /api/v1/credentials/oauth/start` - begin a Claude subscription OAuth login.
/// Returns the consent URL; the PKCE secrets are held server-side until the operator
/// pastes the resulting code back via `.../oauth/finish`.
pub async fn oauth_start(State(state): State<AppState>) -> ApiResult<Json<OauthStartResponse>> {
    let (authorize_url, pending) = crate::claude::oauth::start();
    state.set_pending_oauth(pending);
    Ok(Json(OauthStartResponse { authorize_url }))
}

#[derive(Debug, Deserialize)]
pub struct OauthFinishRequest {
    /// The value from the consent callback page (`<code>#<state>` or a bare code).
    pub code: String,
    /// Optional operator label; defaults to the connected account's email.
    #[serde(default)]
    pub label: String,
}

/// `POST /api/v1/credentials/oauth/finish` - complete the login and store a new
/// subscription-OAuth credential (appended at the bottom of the priority list).
pub async fn oauth_finish(
    State(state): State<AppState>,
    Json(body): Json<OauthFinishRequest>,
) -> ApiResult<Json<Vec<LlmCredentialView>>> {
    let Some(pending) = state.take_pending_oauth() else {
        return Err(eyre::eyre!("no Claude login is in progress; start one first").into());
    };
    let tokens =
        crate::claude::oauth::exchange_code(&body.code, &pending.verifier, &pending.state).await?;
    // The OAuth access token IS the long-lived inference token the agent runs on
    // (exactly what `claude setup-token` returns); it is both the `secret` and the
    // usage access token.
    let expires_at = Utc::now() + Duration::seconds(tokens.expires_in);
    let label = pick_label(&body.label, &tokens.account_email);
    queries::create_llm_credential(
        &state.db,
        "anthropic",
        CredentialKind::SubscriptionOauth.as_str(),
        &label,
        &tokens.access_token,
        &tokens.access_token,
        &tokens.refresh_token,
        Some(expires_at),
        &tokens.scopes,
        &tokens.account_email,
    )
    .await?;
    // A newly added credential may lift an all-exhausted pause.
    orchestrator::credentials::reconcile_pause(&state).await?;
    Ok(Json(list_views(&state).await?))
}

#[derive(Debug, Deserialize)]
pub struct AddTokenRequest {
    /// The long-lived subscription token (`claude setup-token`, `sk-ant-oat01-...`).
    pub token: String,
    #[serde(default)]
    pub label: String,
}

/// `POST /api/v1/credentials/token` - add a long-lived pasted subscription token.
pub async fn add_setup_token(
    State(state): State<AppState>,
    Json(body): Json<AddTokenRequest>,
) -> ApiResult<Json<Vec<LlmCredentialView>>> {
    let token = body.token.trim();
    if token.is_empty() {
        return Err(eyre::eyre!("the token is empty").into());
    }
    let label = pick_label(&body.label, "");
    queries::create_llm_credential(
        &state.db,
        "anthropic",
        CredentialKind::SetupToken.as_str(),
        &label,
        token,
        "",
        "",
        None,
        "",
        "",
    )
    .await?;
    orchestrator::credentials::reconcile_pause(&state).await?;
    Ok(Json(list_views(&state).await?))
}

#[derive(Debug, Deserialize)]
pub struct AddApiKeyRequest {
    pub api_key: String,
    #[serde(default)]
    pub label: String,
}

/// `POST /api/v1/credentials/api-key` - add an Anthropic API key.
pub async fn add_api_key(
    State(state): State<AppState>,
    Json(body): Json<AddApiKeyRequest>,
) -> ApiResult<Json<Vec<LlmCredentialView>>> {
    let key = body.api_key.trim();
    if key.is_empty() {
        return Err(eyre::eyre!("the API key is empty").into());
    }
    let label = pick_label(&body.label, "");
    queries::create_llm_credential(
        &state.db,
        "anthropic",
        CredentialKind::ApiKey.as_str(),
        &label,
        key,
        "",
        "",
        None,
        "",
        "",
    )
    .await?;
    orchestrator::credentials::reconcile_pause(&state).await?;
    Ok(Json(list_views(&state).await?))
}

#[derive(Debug, Deserialize)]
pub struct UpdateRequest {
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,
}

/// `PATCH /api/v1/credentials/:id` - rename or enable/disable a credential.
pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateRequest>,
) -> ApiResult<Json<Vec<LlmCredentialView>>> {
    queries::update_llm_credential(&state.db, id, body.label.as_deref(), body.enabled).await?;
    // Enabling/disabling can change which credential is active or lift/raise a pause.
    orchestrator::credentials::reconcile_pause(&state).await?;
    Ok(Json(list_views(&state).await?))
}

/// `DELETE /api/v1/credentials/:id` - remove a credential.
pub async fn delete(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<serde_json::Value>> {
    let deleted = queries::delete_llm_credential(&state.db, id).await?;
    orchestrator::credentials::reconcile_pause(&state).await?;
    Ok(Json(json!({ "deleted": deleted })))
}

/// Picks the label to store: the operator's trimmed input, else the account email,
/// else a plain empty string (the UI falls back to the kind).
fn pick_label(requested: &str, account_email: &str) -> String {
    let requested = requested.trim();
    if !requested.is_empty() {
        return requested.to_string();
    }
    account_email.trim().to_string()
}
