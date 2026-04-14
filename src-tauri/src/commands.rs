use serde::Deserialize;
use tauri::{AppHandle, State};

use crate::app_prefs;
use crate::companion_window;
use crate::history_engine;
use crate::maintenance_engine;
use crate::models::{
    DailySummary, DailyTotalRow, MaintenanceResult, Profile, SessionHistoryRow, Task, TimerState,
    Todo,
};
use crate::preferences::{self, AppPreferences};
use crate::profile_manager;
use crate::quick_profile;
use crate::report_engine;
use crate::session_engine;
use crate::task_manager;
use crate::todo_manager;
use crate::AppState;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProfileInput {
    pub name: String,
    pub color: Option<String>,
    pub daily_target_minutes: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfileInput {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub daily_target_minutes: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub profile_id: String,
    pub name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub id: String,
    pub name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionInput {
    pub profile_id: String,
    pub task_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTasksInput {
    pub profile_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailySummaryInput {
    pub date: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetLastQuickProfileInput {
    pub profile_id: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryRangeInput {
    pub start_date: String,
    pub end_date: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionHistoryInput {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTodoInput {
    pub title: String,
    pub notes: Option<String>,
    pub sort_index: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTodoInput {
    pub id: String,
    pub title: String,
    pub notes: Option<String>,
    pub last_worked_on_at: Option<i64>,
    pub sort_index: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleTodoDoneInput {
    pub id: String,
    pub done: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTodosInput {
    pub include_removed: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionNotesInput {
    pub session_id: String,
    pub notes: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DateRangeInput {
    pub start_date: String,
    pub end_date: String,
}

#[tauri::command]
pub fn list_profiles(state: State<'_, AppState>) -> Result<Vec<Profile>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    profile_manager::list_profiles(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_profile(
    state: State<'_, AppState>,
    input: CreateProfileInput,
) -> Result<Profile, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    profile_manager::create_profile(
        &conn,
        input.name,
        input.color,
        input.daily_target_minutes,
    )
}

#[tauri::command]
pub fn update_profile(
    state: State<'_, AppState>,
    input: UpdateProfileInput,
) -> Result<Profile, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    profile_manager::update_profile(
        &conn,
        &input.id,
        input.name,
        input.color,
        input.daily_target_minutes,
    )
}

#[tauri::command]
pub fn delete_profile(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    profile_manager::delete_profile(&conn, &id)
}

#[tauri::command]
pub fn list_tasks(state: State<'_, AppState>, input: ListTasksInput) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    task_manager::list_tasks(&conn, &input.profile_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_task(state: State<'_, AppState>, input: CreateTaskInput) -> Result<Task, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    task_manager::create_task(&conn, input.profile_id, input.name)
}

#[tauri::command]
pub fn update_task(state: State<'_, AppState>, input: UpdateTaskInput) -> Result<Task, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    task_manager::update_task(&conn, &input.id, input.name)
}

#[tauri::command]
pub fn delete_task(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    task_manager::delete_task(&conn, &id)
}

#[tauri::command]
pub fn get_timer_state(state: State<'_, AppState>) -> Result<TimerState, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    session_engine::get_timer_state(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn start_session(
    state: State<'_, AppState>,
    input: StartSessionInput,
) -> Result<TimerState, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    session_engine::start_session(&conn, input.profile_id, input.task_id)
}

#[tauri::command]
pub fn pause_session(state: State<'_, AppState>) -> Result<TimerState, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    session_engine::pause_session(&conn)
}

#[tauri::command]
pub fn resume_session(state: State<'_, AppState>) -> Result<TimerState, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    session_engine::resume_session(&conn)
}

#[tauri::command]
pub fn stop_session(state: State<'_, AppState>) -> Result<TimerState, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    session_engine::stop_session(&conn)
}

#[tauri::command]
pub fn start_break(state: State<'_, AppState>) -> Result<TimerState, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    session_engine::start_break(&conn)
}

#[tauri::command]
pub fn end_break(state: State<'_, AppState>) -> Result<TimerState, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    session_engine::end_break(&conn)
}

#[tauri::command]
pub fn update_session_notes(
    state: State<'_, AppState>,
    input: UpdateSessionNotesInput,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    session_engine::update_session_notes(&conn, &input.session_id, input.notes)
}

#[tauri::command]
pub fn get_daily_summary(
    state: State<'_, AppState>,
    input: DailySummaryInput,
) -> Result<DailySummary, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    report_engine::daily_summary(&conn, &input.date)
}

#[tauri::command]
pub fn set_companion_collapsed(app: AppHandle, collapsed: bool) -> Result<(), String> {
    companion_window::set_main_collapsed(&app, collapsed)
}

#[tauri::command]
pub fn set_last_quick_profile(
    state: State<'_, AppState>,
    input: SetLastQuickProfileInput,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    app_prefs::set_last_quick_profile(&conn, &input.profile_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_last_quick_profile(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    app_prefs::get_last_quick_profile(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_quick_session_profile_id() -> String {
    quick_profile::quick_profile_id_string()
}

#[tauri::command]
pub fn get_preferences(state: State<'_, AppState>) -> Result<AppPreferences, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    preferences::get_preferences(&conn)
}

#[tauri::command]
pub fn set_preferences(
    state: State<'_, AppState>,
    input: AppPreferences,
) -> Result<AppPreferences, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    preferences::set_preferences(&conn, input)
}

#[tauri::command]
pub fn get_history_daily_totals(
    state: State<'_, AppState>,
    input: HistoryRangeInput,
) -> Result<Vec<DailyTotalRow>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    history_engine::daily_totals_range(&conn, &input.start_date, &input.end_date)
}

#[tauri::command]
pub fn list_session_history(
    state: State<'_, AppState>,
    input: SessionHistoryInput,
) -> Result<Vec<SessionHistoryRow>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    history_engine::list_sessions(&conn, input.start_date.as_deref(), input.end_date.as_deref())
}

#[tauri::command]
pub fn list_todos(state: State<'_, AppState>, input: Option<ListTodosInput>) -> Result<Vec<Todo>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let include_removed = input.and_then(|i| i.include_removed).unwrap_or(false);
    todo_manager::list_todos(&conn, include_removed)
}

#[tauri::command]
pub fn create_todo(state: State<'_, AppState>, input: CreateTodoInput) -> Result<Todo, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    todo_manager::create_todo(&conn, input.title, input.notes, input.sort_index)
}

#[tauri::command]
pub fn update_todo(state: State<'_, AppState>, input: UpdateTodoInput) -> Result<Todo, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    todo_manager::update_todo(
        &conn,
        &input.id,
        input.title,
        input.notes,
        input.last_worked_on_at,
        input.sort_index,
    )
}

#[tauri::command]
pub fn toggle_todo_done(
    state: State<'_, AppState>,
    input: ToggleTodoDoneInput,
) -> Result<Todo, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    todo_manager::toggle_todo_done(&conn, &input.id, input.done)
}

#[tauri::command]
pub fn remove_todo(state: State<'_, AppState>, id: String) -> Result<Todo, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    todo_manager::remove_todo(&conn, &id)
}

#[tauri::command]
pub fn clear_preferences(state: State<'_, AppState>) -> Result<MaintenanceResult, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    maintenance_engine::clear_preferences(&mut conn)
}

#[tauri::command]
pub fn clear_timer_state(state: State<'_, AppState>) -> Result<MaintenanceResult, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    maintenance_engine::clear_timer_state(&mut conn)
}

#[tauri::command]
pub fn repair_break_sessions(state: State<'_, AppState>) -> Result<MaintenanceResult, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    maintenance_engine::repair_break_sessions(&mut conn)
}

#[tauri::command]
pub fn delete_sessions_in_range(
    state: State<'_, AppState>,
    input: DateRangeInput,
) -> Result<MaintenanceResult, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    maintenance_engine::delete_sessions_in_range(&mut conn, &input.start_date, &input.end_date)
}

#[tauri::command]
pub fn delete_all_sessions(state: State<'_, AppState>) -> Result<MaintenanceResult, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    maintenance_engine::delete_all_sessions(&mut conn)
}

#[tauri::command]
pub fn delete_all_todos(state: State<'_, AppState>) -> Result<MaintenanceResult, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    maintenance_engine::delete_all_todos(&mut conn)
}

#[tauri::command]
pub fn full_reset_all_data(state: State<'_, AppState>) -> Result<MaintenanceResult, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    maintenance_engine::full_reset_all_data(&mut conn)
}
