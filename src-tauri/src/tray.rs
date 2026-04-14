use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{App, Manager};

use crate::app_prefs;
use crate::companion_window;
use crate::models::SessionStatus;
use crate::profile_manager;
use crate::quick_profile;
use crate::session_engine;
use crate::AppState;

fn handle_tray_menu_event(app: &tauri::AppHandle, event: &tauri::menu::MenuEvent) {
    let id = event.id().as_ref();
    match id {
        "tray_open" => companion_window::show_and_focus_main(app),
        "tray_pause" => {
            let state = app.state::<AppState>();
            let Ok(guard) = state.db.lock() else {
                return;
            };
            let _ = session_engine::pause_session(&guard);
        }
        "tray_stop" => {
            let state = app.state::<AppState>();
            let Ok(guard) = state.db.lock() else {
                return;
            };
            let _ = session_engine::stop_session(&guard);
        }
        "tray_start_resume" => {
            let state = app.state::<AppState>();
            let Ok(guard) = state.db.lock() else {
                return;
            };
            let conn = &*guard;
            let Ok(timer) = session_engine::get_timer_state(conn) else {
                return;
            };
            match timer.status {
                Some(SessionStatus::Paused) => {
                    let _ = session_engine::resume_session(conn);
                }
                Some(SessionStatus::Active) => {}
                None => {
                    let last = app_prefs::get_last_quick_profile(conn).unwrap_or(None);
                    if let Some(pid) = last {
                        if profile_manager::get_profile(conn, &pid).is_some() {
                            let _ = session_engine::start_session(conn, pid, None);
                        } else {
                            let _ = session_engine::start_session(
                                conn,
                                quick_profile::QUICK_PROFILE_ID.to_string(),
                                None,
                            );
                        }
                    } else {
                        let _ = session_engine::start_session(
                            conn,
                            quick_profile::QUICK_PROFILE_ID.to_string(),
                            None,
                        );
                    }
                }
                _ => {}
            }
        }
        "tray_quit" => app.exit(0),
        _ => {}
    }
}

pub fn init_tray(app: &mut App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "tray_open", "Open", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let start_resume =
        MenuItem::with_id(app, "tray_start_resume", "Start / Resume", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, "tray_pause", "Pause", true, None::<&str>)?;
    let stop = MenuItem::with_id(app, "tray_stop", "Stop", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "tray_quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &open,
            &sep1,
            &start_resume,
            &pause,
            &stop,
            &sep2,
            &quit,
        ],
    )?;

    let icon = app
        .default_window_icon()
        .expect("default window icon is required for the system tray");

    TrayIconBuilder::with_id("main_tray")
        .icon(icon.clone())
        .tooltip("Time Accountability")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| {
            handle_tray_menu_event(app, &event);
        })
        .build(app)?;

    Ok(())
}
