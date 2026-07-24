//! Questions the agent escalates to the user, and the user's answers.
//!
//! Three audiences share this module:
//! - the agent's `seraphim-ask` helper posts questions (`POST /agent/questions`);
//! - the notifications sidebar lists what is pending (`GET /questions/pending`);
//! - the task view submits answers (`POST /questions/:id/answer`).

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

use super::ApiResult;
use crate::db::models::{AnswerKind, QuestionOption, QuestionStatus, TaskStatus};
use crate::db::queries;
use crate::state::AppState;

/// The most suggested answers a single question may carry.
const MAX_OPTIONS: usize = 3;

#[derive(Debug, Deserialize)]
pub struct AskQuestion {
    pub prompt: String,
    #[serde(default)]
    pub options: Vec<QuestionOption>,
}

#[derive(Debug, Deserialize)]
pub struct AskRequest {
    pub task_id: Uuid,
    pub questions: Vec<AskQuestion>,
}

/// Why a batch of questions must be rejected with a 400, or `None` when it is
/// postable (issue #368).
///
/// A blank-prompt question is the durable hazard: a question with no text can
/// never be answered, so it silently blocks the task in `waiting_for_input`
/// forever and pollutes the notifications sidebar. This guards the server against
/// any buggy client (a `seraphim-ask --help` slip, a mangled JSON payload), not
/// just today's, so a junk question is never persisted.
fn rejection_reason(questions: &[AskQuestion]) -> Option<&'static str> {
    if questions.is_empty() {
        return Some("no questions provided");
    }
    if questions
        .iter()
        .any(|question| question.prompt.trim().is_empty())
    {
        return Some("a question prompt must not be empty");
    }
    None
}

/// `POST /api/v1/agent/questions` - the agent escalates one or more questions.
///
/// Called from inside the workspace by `seraphim-ask`. The task is parked in
/// `waiting_for_input` and the user is notified; the orchestrator resumes the
/// agent once every question is answered.
pub async fn ask(
    State(state): State<AppState>,
    Json(body): Json<AskRequest>,
) -> ApiResult<axum::response::Response> {
    let Some(task) = queries::get_task(&state.db, body.task_id).await? else {
        return Ok((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "task not found" })),
        )
            .into_response());
    };
    if let Some(reason) = rejection_reason(&body.questions) {
        return Ok((StatusCode::BAD_REQUEST, Json(json!({ "error": reason }))).into_response());
    }

    let mut ids = Vec::with_capacity(body.questions.len());
    for question in body.questions {
        // Keep at most the first few options; the UI always adds its own
        // "something else" and "decline" choices.
        let options: Vec<QuestionOption> = question.options.into_iter().take(MAX_OPTIONS).collect();
        // Store the trimmed prompt so surrounding whitespace never persists.
        let created =
            queries::create_question(&state.db, task.id, question.prompt.trim(), &options).await?;
        state.notify_question(task.id, task.title.clone(), created.prompt.clone());
        ids.push(created.id);
    }

    queries::set_task_status(&state.db, task.id, TaskStatus::WaitingForInput).await?;
    state.notify_board();

    Ok(Json(json!({ "question_ids": ids })).into_response())
}

/// `GET /api/v1/questions/pending` - everything awaiting an answer, for the
/// notifications sidebar.
pub async fn pending(State(state): State<AppState>) -> ApiResult<axum::response::Response> {
    let questions = queries::list_pending_questions(&state.db).await?;
    Ok(Json(json!({ "questions": questions })).into_response())
}

#[derive(Debug, Deserialize)]
pub struct AnswerRequest {
    pub kind: AnswerKind,
    /// The chosen option's title, the custom text, or a note when declining.
    #[serde(default)]
    pub text: String,
}

/// `POST /api/v1/questions/:id/answer` - the user answers a pending question.
pub async fn answer(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<AnswerRequest>,
) -> ApiResult<axum::response::Response> {
    let Some(question) = queries::get_question(&state.db, id).await? else {
        return Ok((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "question not found" })),
        )
            .into_response());
    };
    if question.status != QuestionStatus::Pending {
        // Already answered; return it unchanged so a double-submit is harmless.
        return Ok(Json(question).into_response());
    }

    let status = match body.kind {
        AnswerKind::Declined => QuestionStatus::Declined,
        AnswerKind::Option | AnswerKind::Custom => QuestionStatus::Answered,
    };
    let answered = queries::answer_question(&state.db, id, status, body.kind, &body.text).await?;

    // Unpark the task the instant its last question is answered (issue #366): flip
    // it off `waiting_for_input` so the board badge clears immediately and
    // deterministically, instead of lingering until the single-threaded agent loop
    // gets around to resuming it. The answers stay unacknowledged, so
    // `pick_resume_ready` still resumes the task and delivers them.
    queries::clear_waiting_for_input_when_answered(&state.db, question.task_id).await?;

    // The board reflects the status, and once nothing is pending the agent loop
    // picks the task up to resume (see `queries::pick_resume_ready`).
    state.notify_board();

    Ok(Json(answered).into_response())
}

#[cfg(test)]
mod tests {
    use super::{rejection_reason, AskQuestion};

    fn question(prompt: &str) -> AskQuestion {
        AskQuestion {
            prompt: prompt.to_owned(),
            options: Vec::new(),
        }
    }

    #[test]
    fn a_real_question_is_accepted() {
        assert_eq!(rejection_reason(&[question("Which database?")]), None);
    }

    #[test]
    fn an_empty_batch_is_rejected() {
        assert_eq!(rejection_reason(&[]), Some("no questions provided"));
    }

    #[test]
    fn a_blank_prompt_is_rejected() {
        // The core of issue #368: a `--help` slip or a mangled payload can post a
        // question with no real text, which would block the task forever. An empty
        // or whitespace-only prompt is refused before it is ever persisted.
        assert_eq!(
            rejection_reason(&[question("")]),
            Some("a question prompt must not be empty")
        );
        assert_eq!(
            rejection_reason(&[question("   \n\t ")]),
            Some("a question prompt must not be empty")
        );
    }

    #[test]
    fn one_blank_prompt_rejects_the_whole_batch() {
        // A well-formed client never mixes in a blank prompt, so a blank anywhere
        // signals a client bug worth surfacing loudly rather than silently dropping.
        assert_eq!(
            rejection_reason(&[question("Which database?"), question("  ")]),
            Some("a question prompt must not be empty")
        );
    }
}
