use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize};

pub const WIDTH_EXPANDED: u32 = 560;
pub const WIDTH_COLLAPSED: u32 = 300;

fn main_window(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())
}

fn clamp_i32(value: i32, min_value: i32, max_value: i32) -> i32 {
    value.max(min_value).min(max_value)
}

fn clamped_position_for_right_edge(
    area_left: i32,
    area_top: i32,
    area_width: i32,
    area_height: i32,
    right_edge_target: i32,
    window_size: PhysicalSize<u32>,
) -> PhysicalPosition<i32> {
    let area_right = area_left + area_width;
    let area_bottom = area_top + area_height;

    let window_width = window_size.width as i32;
    let window_height = window_size.height as i32;

    let min_x = area_left;
    let max_x = (area_right - window_width).max(area_left);
    let desired_x = right_edge_target - window_width;
    let clamped_x = clamp_i32(desired_x, min_x, max_x);

    let min_y = area_top;
    let max_y = (area_bottom - window_height).max(area_top);
    let clamped_y = clamp_i32(area_top, min_y, max_y);

    PhysicalPosition::new(clamped_x, clamped_y)
}

/// Dock the companion to the right edge of the primary work area at expanded width.
pub fn dock_main_window_to_right(app: &AppHandle) -> Result<(), String> {
    let window = main_window(app)?;
    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "no monitor".to_string())?;
    let area = monitor.work_area();
    let width = WIDTH_EXPANDED;
    let height = (area.size.height as u32).max(400);
    window
        .set_size(PhysicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    let actual_size = window.outer_size().map_err(|e| e.to_string())?;
    let right_edge_target = area.position.x + area.size.width as i32;
    let pos = clamped_position_for_right_edge(
        area.position.x,
        area.position.y,
        area.size.width as i32,
        area.size.height as i32,
        right_edge_target,
        actual_size,
    );
    window
        .set_position(pos)
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Resize width while keeping the window's right edge anchored.
pub fn set_main_collapsed(app: &AppHandle, collapsed: bool) -> Result<(), String> {
    let window = main_window(app)?;
    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "no monitor".to_string())?;
    let area = monitor.work_area();
    let height = (area.size.height as u32).max(400);
    let width = if collapsed {
        WIDTH_COLLAPSED
    } else {
        WIDTH_EXPANDED
    };
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    let sz = window.outer_size().map_err(|e| e.to_string())?;
    let right_edge = pos.x + sz.width as i32;
    window
        .set_size(PhysicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    let actual_size = window.outer_size().map_err(|e| e.to_string())?;
    let clamped_pos = clamped_position_for_right_edge(
        area.position.x,
        area.position.y,
        area.size.width as i32,
        area.size.height as i32,
        right_edge,
        actual_size,
    );
    window
        .set_position(clamped_pos)
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn show_and_focus_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}
