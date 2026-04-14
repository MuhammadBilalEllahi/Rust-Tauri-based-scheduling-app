use rusqlite::{params, Connection};

const LAST_QUICK_PROFILE: &str = "last_quick_start_profile_id";

pub fn get_last_quick_profile(conn: &Connection) -> rusqlite::Result<Option<String>> {
    match conn.query_row(
        "SELECT value FROM app_kv WHERE key = ?1",
        params![LAST_QUICK_PROFILE],
        |r| r.get::<_, String>(0),
    ) {
        Ok(v) => Ok(Some(v)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn set_last_quick_profile(conn: &Connection, profile_id: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO app_kv (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![LAST_QUICK_PROFILE, profile_id],
    )?;
    Ok(())
}
