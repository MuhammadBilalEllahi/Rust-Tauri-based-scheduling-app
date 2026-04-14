use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::models::Todo;

fn now_ms() -> i64 {
    Utc::now().timestamp_millis()
}

/// Active rows first, then done, then removed (when included). Newest active first; recently completed first.
fn todo_list_order_sql(include_removed: bool) -> &'static str {
    if include_removed {
        "SELECT id, title, notes, status, created_at, updated_at, completed_at, removed_at, last_worked_on_at, sort_index \
         FROM todos ORDER BY \
         CASE WHEN status = 'active' THEN 0 WHEN status = 'done' THEN 1 ELSE 2 END ASC, \
         CASE \
             WHEN status = 'active' THEN created_at \
             WHEN status = 'done' THEN COALESCE(completed_at, updated_at) \
             ELSE COALESCE(removed_at, updated_at) \
         END DESC"
    } else {
        "SELECT id, title, notes, status, created_at, updated_at, completed_at, removed_at, last_worked_on_at, sort_index \
         FROM todos WHERE status != 'removed' ORDER BY \
         CASE WHEN status = 'active' THEN 0 WHEN status = 'done' THEN 1 ELSE 2 END ASC, \
         CASE \
             WHEN status = 'active' THEN created_at \
             WHEN status = 'done' THEN COALESCE(completed_at, updated_at) \
             ELSE COALESCE(removed_at, updated_at) \
         END DESC"
    }
}

pub fn list_todos(conn: &Connection, include_removed: bool) -> Result<Vec<Todo>, String> {
    let sql = todo_list_order_sql(include_removed);
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Todo {
                id: row.get(0)?,
                title: row.get(1)?,
                notes: row.get(2)?,
                status: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                completed_at: row.get(6)?,
                removed_at: row.get(7)?,
                last_worked_on_at: row.get(8)?,
                sort_index: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())
}

pub fn create_todo(
    conn: &Connection,
    title: String,
    notes: Option<String>,
    sort_index: Option<i64>,
) -> Result<Todo, String> {
    let now = now_ms();
    let id = Uuid::new_v4().to_string();
    let sort_value = sort_index.unwrap_or(0);
    conn.execute(
        "INSERT INTO todos (id, title, notes, status, created_at, updated_at, completed_at, removed_at, last_worked_on_at, sort_index)
         VALUES (?1, ?2, ?3, 'active', ?4, ?4, NULL, NULL, NULL, ?5)",
        params![id, title.trim(), notes, now, sort_value],
    )
    .map_err(|e| e.to_string())?;
    get_todo(conn, &id)
}

pub fn update_todo(
    conn: &Connection,
    id: &str,
    title: String,
    notes: Option<String>,
    last_worked_on_at: Option<i64>,
    sort_index: Option<i64>,
) -> Result<Todo, String> {
    let now = now_ms();
    let affected = conn
        .execute(
            "UPDATE todos
             SET title = ?2, notes = ?3, updated_at = ?4,
                 last_worked_on_at = COALESCE(?5, last_worked_on_at),
                 sort_index = COALESCE(?6, sort_index)
             WHERE id = ?1",
            params![id, title.trim(), notes, now, last_worked_on_at, sort_index],
        )
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Todo not found".to_string());
    }
    get_todo(conn, id)
}

pub fn toggle_todo_done(conn: &Connection, id: &str, done: bool) -> Result<Todo, String> {
    let now = now_ms();
    let (status, completed_at) = if done {
        ("done", Some(now))
    } else {
        ("active", None)
    };
    let affected = conn
        .execute(
            "UPDATE todos
             SET status = ?2, updated_at = ?3, completed_at = ?4
             WHERE id = ?1 AND status != 'removed'",
            params![id, status, now, completed_at],
        )
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Todo not found".to_string());
    }
    get_todo(conn, id)
}

pub fn remove_todo(conn: &Connection, id: &str) -> Result<Todo, String> {
    let now = now_ms();
    let affected = conn
        .execute(
            "UPDATE todos SET status = 'removed', removed_at = ?2, updated_at = ?2 WHERE id = ?1",
            params![id, now],
        )
        .map_err(|e| e.to_string())?;
    if affected == 0 {
        return Err("Todo not found".to_string());
    }
    get_todo(conn, id)
}

fn get_todo(conn: &Connection, id: &str) -> Result<Todo, String> {
    conn.query_row(
        "SELECT id, title, notes, status, created_at, updated_at, completed_at, removed_at, last_worked_on_at, sort_index
         FROM todos WHERE id = ?1",
        params![id],
        |row| {
            Ok(Todo {
                id: row.get(0)?,
                title: row.get(1)?,
                notes: row.get(2)?,
                status: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                completed_at: row.get(6)?,
                removed_at: row.get(7)?,
                last_worked_on_at: row.get(8)?,
                sort_index: row.get(9)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}
