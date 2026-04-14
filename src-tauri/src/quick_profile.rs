//! System profile for frictionless "Quick Session" tracking (no user profile required in UI).

use chrono::Utc;
use rusqlite::{params, Connection};

pub const QUICK_PROFILE_ID: &str = "__quick_session__";

pub fn ensure_quick_profile(conn: &Connection) -> rusqlite::Result<()> {
    let now = Utc::now().timestamp_millis();
    conn.execute(
        "INSERT OR IGNORE INTO profiles (id, name, color, daily_target_minutes, created_at) VALUES (?1, 'Quick Session', NULL, NULL, ?2)",
        params![QUICK_PROFILE_ID, now],
    )?;
    Ok(())
}

pub fn quick_profile_id_string() -> String {
    QUICK_PROFILE_ID.to_string()
}
