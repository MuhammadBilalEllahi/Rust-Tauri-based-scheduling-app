use std::collections::HashMap;

use chrono::{DateTime, Local, NaiveDate, TimeZone, Utc};
use rusqlite::{params, Connection};

use crate::models::{DailySummary, ProfileDayRow, SessionStatus, TaskDayRow};
use crate::session_engine;

fn local_ymd(ms: i64) -> String {
    DateTime::from_timestamp_millis(ms)
        .unwrap_or_else(|| Utc.with_ymd_and_hms(1970, 1, 1, 0, 0, 0).unwrap())
        .with_timezone(&Local)
        .format("%Y-%m-%d")
        .to_string()
}

pub fn daily_summary(conn: &Connection, date: &str) -> Result<DailySummary, String> {
    NaiveDate::parse_from_str(date, "%Y-%m-%d").map_err(|_| "Invalid date (use YYYY-MM-DD)".to_string())?;

    let mut profile_actual: HashMap<String, i64> = HashMap::new();
    let mut task_actual: HashMap<String, (String, String, i64)> = HashMap::new();

    let mut stmt = conn
        .prepare(
            r#"
            SELECT s.profile_id, s.accumulated_seconds, s.running_since, s.status,
                   s.task_id, t.name AS task_name
            FROM sessions s
            JOIN profiles p ON p.id = s.profile_id
            LEFT JOIN tasks t ON t.id = s.task_id
            WHERE date(s.started_at / 1000, 'unixepoch', 'localtime') = ?1
              AND s.status = 'completed'
            "#,
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![date], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, Option<i64>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for r in rows {
        let (pid, acc, rs, status_s, task_id, task_name) = r.map_err(|e| e.to_string())?;
        let status = SessionStatus::parse(&status_s).unwrap_or(SessionStatus::Completed);
        let secs = session_engine::compute_display_seconds(acc, rs, &status);
        *profile_actual.entry(pid.clone()).or_insert(0) += secs;
        if let Some(tid) = task_id {
            let name = task_name.unwrap_or_default();
            task_actual
                .entry(tid)
                .and_modify(|e| {
                    e.0 = pid.clone();
                    if !name.is_empty() {
                        e.1 = name.clone();
                    }
                    e.2 += secs;
                })
                .or_insert((pid, name, secs));
        }
    }

    let open = session_engine::get_timer_state(conn).map_err(|e| e.to_string())?;
    if let (Some(pid), Some(started), Some(_status)) = (
        open.profile_id.as_ref(),
        open.started_at,
        open.status.as_ref(),
    ) {
        if local_ymd(started) == date {
            let secs = open.display_seconds;
            *profile_actual.entry(pid.clone()).or_insert(0) += secs;
            if let (Some(tid), Some(tname)) = (open.task_id.as_ref(), open.task_name.as_ref()) {
                task_actual
                    .entry(tid.clone())
                    .and_modify(|e| {
                        e.0 = pid.clone();
                        e.1 = tname.clone();
                        e.2 += secs;
                    })
                    .or_insert((pid.clone(), tname.clone(), secs));
            }
        }
    }

    let profiles_db = crate::profile_manager::list_profiles(conn).map_err(|e| e.to_string())?;
    let mut profiles_out: Vec<ProfileDayRow> = profiles_db
        .into_iter()
        .map(|p| {
            let actual_sec = profile_actual.get(&p.id).copied().unwrap_or(0);
            let actual_minutes = actual_sec / 60;
            let target_minutes = p.daily_target_minutes;
            let delta_minutes = target_minutes.map(|t| actual_minutes - t);
            ProfileDayRow {
                profile_id: p.id,
                profile_name: p.name,
                color: p.color,
                actual_minutes,
                target_minutes,
                delta_minutes,
            }
        })
        .collect();

    profiles_out.sort_by(|a, b| a.profile_name.cmp(&b.profile_name));

    let mut tasks_out: Vec<TaskDayRow> = Vec::new();
    for (task_id, (profile_id, task_name, secs)) in task_actual {
        let pname: String = conn
            .query_row(
                "SELECT name FROM profiles WHERE id = ?1",
                params![profile_id],
                |row| row.get(0),
            )
            .unwrap_or_default();
        tasks_out.push(TaskDayRow {
            task_id,
            task_name,
            profile_id,
            profile_name: pname,
            actual_minutes: secs / 60,
        });
    }
    tasks_out.sort_by(|a, b| a.profile_name.cmp(&b.profile_name).then(a.task_name.cmp(&b.task_name)));

    let total_actual_minutes: i64 = profiles_out.iter().map(|p| p.actual_minutes).sum();

    Ok(DailySummary {
        date: date.to_string(),
        total_actual_minutes,
        profiles: profiles_out,
        tasks: tasks_out,
    })
}
