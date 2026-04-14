use std::sync::Mutex;

use rusqlite::Connection;
use tauri::Manager;

mod app_prefs;
mod commands;
mod companion_window;
mod history_engine;
mod maintenance_engine;
mod models;
mod preferences;
mod profile_manager;
mod quick_profile;
mod report_engine;
mod session_engine;
mod storage;
mod task_manager;
mod todo_manager;
mod tray;

pub struct AppState {
    pub db: Mutex<Connection>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;
            std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app data dir: {e}"))?;
            let db_path = dir.join("time_accountability.sqlite");
            let conn = storage::open(&db_path).map_err(|e| format!("Failed to open database: {e}"))?;
            app.manage(AppState {
                db: Mutex::new(conn),
            });
            companion_window::dock_main_window_to_left(app.handle())
                .map_err(|e| format!("Failed to position window: {e}"))?;
            tray::init_tray(app).map_err(|e| format!("Failed to init tray: {e}"))?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_profiles,
            commands::create_profile,
            commands::update_profile,
            commands::delete_profile,
            commands::list_tasks,
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            commands::get_timer_state,
            commands::start_session,
            commands::pause_session,
            commands::resume_session,
            commands::stop_session,
            commands::start_break,
            commands::end_break,
            commands::update_session_notes,
            commands::get_daily_summary,
            commands::set_companion_collapsed,
            commands::set_last_quick_profile,
            commands::get_last_quick_profile,
            commands::get_quick_session_profile_id,
            commands::get_preferences,
            commands::set_preferences,
            commands::get_history_daily_totals,
            commands::list_session_history,
            commands::list_todos,
            commands::create_todo,
            commands::update_todo,
            commands::toggle_todo_done,
            commands::remove_todo,
            commands::clear_preferences,
            commands::clear_timer_state,
            commands::repair_break_sessions,
            commands::delete_sessions_in_range,
            commands::delete_all_sessions,
            commands::delete_all_todos,
            commands::full_reset_all_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
