use serde::Deserialize;
use tauri::{AppHandle, State};

use crate::app_prefs;
use crate::companion_window;
use crate::models::{DailySummary, Profile, Task, TimerState};
use crate::profile_manager;
use crate::quick_profile;
use crate::report_engine;
use crate::session_engine;
use crate::task_manager;
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
