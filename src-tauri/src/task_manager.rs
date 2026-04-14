use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::models::Task;

pub fn list_tasks(conn: &Connection, profile_id: &str) -> rusqlite::Result<Vec<Task>> {
    let mut stmt = conn.prepare(
        "SELECT id, profile_id, name, created_at FROM tasks WHERE profile_id = ?1 ORDER BY name",
    )?;
    let rows = stmt.query_map(params![profile_id], |row| {
        Ok(Task {
            id: row.get(0)?,
            profile_id: row.get(1)?,
            name: row.get(2)?,
            created_at: row.get(3)?,
        })
    })?;
    rows.collect()
}

pub fn create_task(conn: &Connection, profile_id: String, name: String) -> Result<Task, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Task name is required".into());
    }
    let exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM profiles WHERE id = ?1",
            params![profile_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if exists == 0 {
        return Err("Profile not found".into());
    }
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().timestamp_millis();
    conn.execute(
        "INSERT INTO tasks (id, profile_id, name, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![id, profile_id, name, created_at],
    )
    .map_err(|e| e.to_string())?;
    get_task(conn, &id).ok_or_else(|| "Failed to load task".into())
}

pub fn update_task(conn: &Connection, id: &str, name: String) -> Result<Task, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Task name is required".into());
    }
    let n = conn
        .execute("UPDATE tasks SET name = ?2 WHERE id = ?1", params![id, name])
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Task not found".into());
    }
    get_task(conn, id).ok_or_else(|| "Task not found".into())
}

pub fn delete_task(conn: &Connection, id: &str) -> Result<(), String> {
    let n = conn
        .execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Task not found".into());
    }
    Ok(())
}

pub fn get_task(conn: &Connection, id: &str) -> Option<Task> {
    conn.query_row(
        "SELECT id, profile_id, name, created_at FROM tasks WHERE id = ?1",
        params![id],
        |row| {
            Ok(Task {
                id: row.get(0)?,
                profile_id: row.get(1)?,
                name: row.get(2)?,
                created_at: row.get(3)?,
            })
        },
    )
    .ok()
}

pub fn task_belongs_to_profile(conn: &Connection, task_id: &str, profile_id: &str) -> Result<bool, String> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM tasks WHERE id = ?1 AND profile_id = ?2",
            params![task_id, profile_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(count > 0)
}
