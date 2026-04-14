use rusqlite::{params, Connection};

use crate::models::{DailyTotalRow, SessionHistoryRow, SessionStatus};
use crate::session_engine;

pub fn daily_totals_range(
    conn: &Connection,
    start_date: &str,
    end_date: &str,
) -> Result<Vec<DailyTotalRow>, String> {
    let mut stmt = conn
        .prepare(
            r#"
            SELECT date(s.started_at / 1000, 'unixepoch', 'localtime') AS day,
                   SUM(s.accumulated_seconds) AS total_seconds,
                   COUNT(*) AS session_count
            FROM sessions s
            WHERE s.status = 'completed'
              AND date(s.started_at / 1000, 'unixepoch', 'localtime') >= ?1
              AND date(s.started_at / 1000, 'unixepoch', 'localtime') <= ?2
            GROUP BY day
            ORDER BY day ASC
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(DailyTotalRow {
                date: row.get(0)?,
                total_seconds: row.get::<_, i64>(1)?,
                session_count: row.get::<_, i64>(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())
}

pub fn list_sessions(
    conn: &Connection,
    start_date: Option<&str>,
    end_date: Option<&str>,
) -> Result<Vec<SessionHistoryRow>, String> {
    let mut sql = String::from(
        r#"
        SELECT s.id, s.profile_id, p.name, s.task_id, t.name, s.started_at, s.ended_at,
               s.accumulated_seconds, s.running_since, s.status, s.timezone_mode, s.timezone_id,
               COALESCE(s.session_type, 'work') AS session_type, s.notes
        FROM sessions s
        JOIN profiles p ON p.id = s.profile_id
        LEFT JOIN tasks t ON t.id = s.task_id
        WHERE s.status = 'completed'
        "#,
    );
    if start_date.is_some() {
        sql.push_str(" AND date(s.started_at / 1000, 'unixepoch', 'localtime') >= ?1");
    }
    if end_date.is_some() {
        if start_date.is_some() {
            sql.push_str(" AND date(s.started_at / 1000, 'unixepoch', 'localtime') <= ?2");
        } else {
            sql.push_str(" AND date(s.started_at / 1000, 'unixepoch', 'localtime') <= ?1");
        }
    }
    sql.push_str(" ORDER BY s.started_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let mapped = match (start_date, end_date) {
        (Some(start), Some(end)) => stmt
            .query_map(params![start, end], map_session_row)
            .map_err(|e| e.to_string())?,
        (Some(start), None) => stmt
            .query_map(params![start], map_session_row)
            .map_err(|e| e.to_string())?,
        (None, Some(end)) => stmt
            .query_map(params![end], map_session_row)
            .map_err(|e| e.to_string())?,
        (None, None) => stmt.query_map([], map_session_row).map_err(|e| e.to_string())?,
    };

    mapped
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())
}

fn map_session_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<SessionHistoryRow> {
    let accumulated_seconds: i64 = row.get(7)?;
    let running_since: Option<i64> = row.get(8)?;
    let status_raw: String = row.get(9)?;
    let status = SessionStatus::parse(&status_raw).unwrap_or(SessionStatus::Completed);
    Ok(SessionHistoryRow {
        session_id: row.get(0)?,
        profile_id: row.get(1)?,
        profile_name: row.get(2)?,
        task_id: row.get(3)?,
        task_name: row.get(4)?,
        started_at: row.get(5)?,
        ended_at: row.get(6)?,
        duration_seconds: session_engine::compute_display_seconds(
            accumulated_seconds,
            running_since,
            &status,
        ),
        timezone_mode: row.get(10)?,
        timezone_id: row.get(11)?,
        session_type: row.get(12)?,
        notes: row.get(13)?,
    })
}
