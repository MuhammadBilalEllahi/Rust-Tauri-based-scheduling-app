use std::sync::Mutex;

use rusqlite::Connection;
use tauri::Manager;

mod commands;
mod models;
mod profile_manager;
mod report_engine;
mod session_engine;
mod storage;
mod task_manager;

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
            Ok(())
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
            commands::get_daily_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
