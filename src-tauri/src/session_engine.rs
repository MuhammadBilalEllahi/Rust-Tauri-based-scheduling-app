use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

use crate::models::{SessionStatus, TimerState};
use crate::profile_manager;
use crate::task_manager;

/// Row from `get_timer_state` open-session query (session + profile name).
type OpenSessionRow = (
    String,
    String,
    Option<String>,
    String,
    i64,
    i64,
    Option<i64>,
    String,
);

fn now_ms() -> i64 {
    Utc::now().timestamp_millis()
}

pub fn get_timer_state(conn: &Connection) -> rusqlite::Result<TimerState> {
    let row: Option<OpenSessionRow> = conn
        .query_row(
            r#"
            SELECT s.id, s.profile_id, s.task_id, s.status, s.started_at, s.accumulated_seconds, s.running_since,
                   p.name AS profile_name
            FROM sessions s
            JOIN profiles p ON p.id = s.profile_id
            WHERE s.status IN ('active', 'paused')
            LIMIT 1
            "#,
            [],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                ))
            },
        )
        .optional()?;

    let Some((sid, pid, tid, status_s, started_at, accumulated, running_since, profile_name)) = row
    else {
        return Ok(TimerState {
            session_id: None,
            profile_id: None,
            profile_name: None,
            task_id: None,
            task_name: None,
            status: None,
            started_at: None,
            display_seconds: 0,
            accumulated_seconds: 0,
            running_since: None,
        });
    };

    let status = SessionStatus::parse(&status_s).unwrap_or(SessionStatus::Paused);
    let display_seconds = compute_display_seconds(accumulated, running_since, &status);

    let task_name = match &tid {
        Some(task_id) => conn
            .query_row(
                "SELECT name FROM tasks WHERE id = ?1",
                params![task_id],
                |row| row.get::<_, String>(0),
            )
            .ok(),
        None => None,
    };

    Ok(TimerState {
        session_id: Some(sid),
        profile_id: Some(pid),
        profile_name: Some(profile_name),
        task_id: tid,
        task_name,
        status: Some(status),
        started_at: Some(started_at),
        display_seconds,
        accumulated_seconds: accumulated,
        running_since,
    })
}

pub fn compute_display_seconds(
    accumulated_seconds: i64,
    running_since: Option<i64>,
    status: &SessionStatus,
) -> i64 {
    let mut total = accumulated_seconds;
    if *status == SessionStatus::Active {
        if let Some(rs) = running_since {
            let delta_ms = now_ms().saturating_sub(rs);
            total = total.saturating_add(delta_ms / 1000);
        }
    }
    total
}

fn fold_running_slice(
    conn: &Connection,
    session_id: &str,
    status: &SessionStatus,
) -> rusqlite::Result<()> {
    if *status != SessionStatus::Active {
        return Ok(());
    }
    let (accumulated, running_since): (i64, Option<i64>) = conn.query_row(
        "SELECT accumulated_seconds, running_since FROM sessions WHERE id = ?1",
        params![session_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )?;
    if let Some(rs) = running_since {
        let delta = (now_ms().saturating_sub(rs)) / 1000;
        let new_acc = accumulated.saturating_add(delta);
        conn.execute(
            "UPDATE sessions SET accumulated_seconds = ?2, running_since = NULL WHERE id = ?1",
            params![session_id, new_acc],
        )?;
    }
    Ok(())
}

pub fn start_session(
    conn: &Connection,
    profile_id: String,
    task_id: Option<String>,
) -> Result<TimerState, String> {
    if profile_manager::get_profile(conn, &profile_id).is_none() {
        return Err("Profile not found".into());
    }
    if let Some(ref tid) = task_id {
        if !task_manager::task_belongs_to_profile(conn, tid, &profile_id)? {
            return Err("Task does not belong to the selected profile".into());
        }
    }

    let open: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sessions WHERE status IN ('active', 'paused')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if open > 0 {
        return Err("A session is already active or paused. Stop or resume it first.".into());
    }

    let id = Uuid::new_v4().to_string();
    let started_at = now_ms();
    conn.execute(
        "INSERT INTO sessions (id, profile_id, task_id, status, started_at, ended_at, accumulated_seconds, running_since)
         VALUES (?1, ?2, ?3, 'active', ?4, NULL, 0, ?5)",
        params![id, profile_id, task_id, started_at, started_at],
    )
    .map_err(|e| e.to_string())?;

    get_timer_state(conn).map_err(|e| e.to_string())
}

pub fn pause_session(conn: &Connection) -> Result<TimerState, String> {
    let (id, status_s): (String, String) = conn
        .query_row(
            "SELECT id, status FROM sessions WHERE status IN ('active', 'paused') LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "No active session".to_string())?;

    let status = SessionStatus::parse(&status_s).ok_or_else(|| "Invalid session status".to_string())?;
    if status != SessionStatus::Active {
        return Err("Session is not running".into());
    }

    fold_running_slice(conn, &id, &SessionStatus::Active).map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE sessions SET status = 'paused' WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;

    get_timer_state(conn).map_err(|e| e.to_string())
}

pub fn resume_session(conn: &Connection) -> Result<TimerState, String> {
    let (id, status_s): (String, String) = conn
        .query_row(
            "SELECT id, status FROM sessions WHERE status IN ('active', 'paused') LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "No session to resume".to_string())?;

    let status = SessionStatus::parse(&status_s).ok_or_else(|| "Invalid session status".to_string())?;
    if status != SessionStatus::Paused {
        return Err("Session is not paused".into());
    }

    let t = now_ms();
    conn.execute(
        "UPDATE sessions SET status = 'active', running_since = ?2 WHERE id = ?1",
        params![id, t],
    )
    .map_err(|e| e.to_string())?;

    get_timer_state(conn).map_err(|e| e.to_string())
}

pub fn stop_session(conn: &Connection) -> Result<TimerState, String> {
    let (id, status_s): (String, String) = conn
        .query_row(
            "SELECT id, status FROM sessions WHERE status IN ('active', 'paused') LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "No active session".to_string())?;

    let status = SessionStatus::parse(&status_s).ok_or_else(|| "Invalid session status".to_string())?;
    fold_running_slice(conn, &id, &status).map_err(|e| e.to_string())?;

    let ended = now_ms();
    conn.execute(
        "UPDATE sessions SET status = 'completed', ended_at = ?2, running_since = NULL WHERE id = ?1",
        params![id, ended],
    )
    .map_err(|e| e.to_string())?;

    Ok(TimerState {
        session_id: None,
        profile_id: None,
        profile_name: None,
        task_id: None,
        task_name: None,
        status: None,
        started_at: None,
        display_seconds: 0,
        accumulated_seconds: 0,
        running_since: None,
    })
}
