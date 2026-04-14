use chrono::Utc;
use rusqlite::{params, Connection};

use crate::models::MaintenanceResult;

const APP_PREFS_KEY: &str = "app_preferences";
const LAST_QUICK_PROFILE_KEY: &str = "last_quick_start_profile_id";

fn now_ms() -> i64 {
    Utc::now().timestamp_millis()
}

pub fn clear_preferences(conn: &mut Connection) -> Result<MaintenanceResult, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let affected = tx
        .execute(
            "DELETE FROM app_kv WHERE key IN (?1, ?2)",
            params![APP_PREFS_KEY, LAST_QUICK_PROFILE_KEY],
        )
        .map_err(|e| e.to_string())? as i64;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(MaintenanceResult {
        affected_rows: affected,
        message: "Preferences reset to defaults".to_string(),
    })
}

pub fn clear_timer_state(conn: &mut Connection) -> Result<MaintenanceResult, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = now_ms();
    let mut stmt = tx
        .prepare(
            "SELECT id, status, accumulated_seconds, running_since
             FROM sessions
             WHERE status IN ('active', 'paused')",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, Option<i64>>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut count = 0_i64;
    for row in rows {
        let (id, status, accumulated, running_since) = row.map_err(|e| e.to_string())?;
        let new_acc = if status == "active" {
            let delta = running_since
                .map(|rs| (now.saturating_sub(rs)) / 1000)
                .unwrap_or(0);
            accumulated.saturating_add(delta)
        } else {
            accumulated
        };
        tx.execute(
            "UPDATE sessions
             SET status = 'completed', ended_at = ?2, accumulated_seconds = ?3, running_since = NULL
             WHERE id = ?1",
            params![id, now, new_acc],
        )
        .map_err(|e| e.to_string())?;
        count += 1;
    }
    drop(stmt);
    tx.commit().map_err(|e| e.to_string())?;
    Ok(MaintenanceResult {
        affected_rows: count,
        message: "Open timer state cleared".to_string(),
    })
}

pub fn repair_break_sessions(conn: &mut Connection) -> Result<MaintenanceResult, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let now = now_ms();
    let mut stmt = tx
        .prepare(
            "SELECT id, status, accumulated_seconds, running_since, parent_session_id
             FROM sessions
             WHERE status IN ('active', 'paused')
               AND COALESCE(session_type, 'work') = 'break'",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, Option<i64>>(3)?,
                row.get::<_, Option<String>>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut fixed = 0_i64;
    let mut resumed = 0_i64;
    for row in rows {
        let (break_id, status, accumulated, running_since, parent_id) = row.map_err(|e| e.to_string())?;
        let new_acc = if status == "active" {
            let delta = running_since
                .map(|rs| (now.saturating_sub(rs)) / 1000)
                .unwrap_or(0);
            accumulated.saturating_add(delta)
        } else {
            accumulated
        };
        tx.execute(
            "UPDATE sessions
             SET status = 'completed', ended_at = ?2, accumulated_seconds = ?3, running_since = NULL
             WHERE id = ?1",
            params![break_id, now, new_acc],
        )
        .map_err(|e| e.to_string())?;
        fixed += 1;

        if let Some(pid) = parent_id {
            let parent = tx.query_row(
                "SELECT status, COALESCE(session_type, 'work') FROM sessions WHERE id = ?1",
                params![pid],
                |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
            );
            if let Ok((parent_status, parent_type)) = parent {
                if parent_status == "paused" && parent_type == "work" {
                    tx.execute(
                        "UPDATE sessions SET status = 'active', running_since = ?2 WHERE id = ?1",
                        params![pid, now],
                    )
                    .map_err(|e| e.to_string())?;
                    resumed += 1;
                }
            }
        }
    }
    drop(stmt);
    tx.commit().map_err(|e| e.to_string())?;
    Ok(MaintenanceResult {
        affected_rows: fixed + resumed,
        message: format!("Repaired {fixed} break session(s), resumed {resumed} parent session(s)"),
    })
}

pub fn delete_sessions_in_range(
    conn: &mut Connection,
    start_date: &str,
    end_date: &str,
) -> Result<MaintenanceResult, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let affected = tx
        .execute(
            "DELETE FROM sessions
             WHERE date(started_at / 1000, 'unixepoch', 'localtime') >= ?1
               AND date(started_at / 1000, 'unixepoch', 'localtime') <= ?2",
            params![start_date, end_date],
        )
        .map_err(|e| e.to_string())? as i64;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(MaintenanceResult {
        affected_rows: affected,
        message: "Session range deleted".to_string(),
    })
}

pub fn delete_all_sessions(conn: &mut Connection) -> Result<MaintenanceResult, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let affected = tx
        .execute("DELETE FROM sessions", [])
        .map_err(|e| e.to_string())? as i64;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(MaintenanceResult {
        affected_rows: affected,
        message: "All sessions deleted".to_string(),
    })
}

pub fn delete_all_todos(conn: &mut Connection) -> Result<MaintenanceResult, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let affected = tx.execute("DELETE FROM todos", []).map_err(|e| e.to_string())? as i64;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(MaintenanceResult {
        affected_rows: affected,
        message: "All todos deleted".to_string(),
    })
}

pub fn full_reset_all_data(conn: &mut Connection) -> Result<MaintenanceResult, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let sessions = tx.execute("DELETE FROM sessions", []).map_err(|e| e.to_string())? as i64;
    let todos = tx.execute("DELETE FROM todos", []).map_err(|e| e.to_string())? as i64;
    let keys = tx.execute("DELETE FROM app_kv", []).map_err(|e| e.to_string())? as i64;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(MaintenanceResult {
        affected_rows: sessions + todos + keys,
        message: "Full app reset completed".to_string(),
    })
}
