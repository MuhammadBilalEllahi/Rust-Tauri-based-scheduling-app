use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::models::Profile;

pub fn list_profiles(conn: &Connection) -> rusqlite::Result<Vec<Profile>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, color, daily_target_minutes, created_at FROM profiles ORDER BY name",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Profile {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            daily_target_minutes: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    rows.collect()
}

pub fn create_profile(
    conn: &Connection,
    name: String,
    color: Option<String>,
    daily_target_minutes: Option<i64>,
) -> Result<Profile, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Profile name is required".into());
    }
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().timestamp_millis();
    conn.execute(
        "INSERT INTO profiles (id, name, color, daily_target_minutes, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, name, color, daily_target_minutes, created_at],
    )
    .map_err(|e| e.to_string())?;
    get_profile(conn, &id).ok_or_else(|| "Failed to load profile".into())
}

pub fn update_profile(
    conn: &Connection,
    id: &str,
    name: String,
    color: Option<String>,
    daily_target_minutes: Option<i64>,
) -> Result<Profile, String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("Profile name is required".into());
    }
    let n = conn
        .execute(
            "UPDATE profiles SET name = ?2, color = ?3, daily_target_minutes = ?4 WHERE id = ?1",
            params![id, name, color, daily_target_minutes],
        )
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Profile not found".into());
    }
    get_profile(conn, id).ok_or_else(|| "Profile not found".into())
}

pub fn delete_profile(conn: &Connection, id: &str) -> Result<(), String> {
    let n = conn
        .execute("DELETE FROM profiles WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err("Profile not found".into());
    }
    Ok(())
}

pub fn get_profile(conn: &Connection, id: &str) -> Option<Profile> {
    conn.query_row(
        "SELECT id, name, color, daily_target_minutes, created_at FROM profiles WHERE id = ?1",
        params![id],
        |row| {
            Ok(Profile {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                daily_target_minutes: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    )
    .ok()
}
