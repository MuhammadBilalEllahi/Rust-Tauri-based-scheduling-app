use std::path::Path;

use rusqlite::{Connection, OptionalExtension};

use crate::quick_profile;

pub fn open(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    init_schema(&conn)?;
    migrate(&conn)?;
    quick_profile::ensure_quick_profile(&conn)?;
    Ok(conn)
}

pub fn init_schema(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            color TEXT,
            daily_target_minutes INTEGER,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY NOT NULL,
            profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY NOT NULL,
            profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
            status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed')),
            started_at INTEGER NOT NULL,
            ended_at INTEGER,
            accumulated_seconds INTEGER NOT NULL DEFAULT 0,
            running_since INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_profile ON tasks(profile_id);

        CREATE TABLE IF NOT EXISTS app_kv (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
        );
        "#,
    )?;
    Ok(())
}

fn has_column(conn: &Connection, table: &str, column: &str) -> rusqlite::Result<bool> {
    let sql = format!("PRAGMA table_info({table})");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(1))?;
    let mut found = false;
    for name in rows {
        if name? == column {
            found = true;
            break;
        }
    }
    Ok(found)
}

pub fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    let mut version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    if version < 1 {
        if !has_column(conn, "sessions", "timezone_mode")? {
            conn.execute(
                "ALTER TABLE sessions ADD COLUMN timezone_mode TEXT NOT NULL DEFAULT 'auto'",
                [],
            )?;
        }
        if !has_column(conn, "sessions", "timezone_id")? {
            conn.execute("ALTER TABLE sessions ADD COLUMN timezone_id TEXT", [])?;
        }
        conn.execute(
            "UPDATE sessions SET timezone_mode = 'auto' WHERE timezone_mode IS NULL OR timezone_mode = ''",
            [],
        )?;
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY NOT NULL,
                title TEXT NOT NULL,
                notes TEXT,
                status TEXT NOT NULL CHECK (status IN ('active', 'done', 'removed')),
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                completed_at INTEGER,
                removed_at INTEGER,
                last_worked_on_at INTEGER,
                sort_index INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
            CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
            "#,
        )?;
        conn.execute_batch("PRAGMA user_version = 1;")?;
        version = 1;
    }

    if version < 2 {
        let existing: Option<String> = conn
            .query_row(
                "SELECT value FROM app_kv WHERE key = 'app_preferences'",
                [],
                |row| row.get(0),
            )
            .optional()?;
        if existing.is_none() {
            conn.execute(
                "INSERT INTO app_kv (key, value) VALUES ('app_preferences', ?1)",
                [r#"{"timezoneMode":"auto","timezoneId":null,"showMilliseconds":false,"historyViewMode":"calendar"}"#],
            )?;
        }
        conn.execute_batch("PRAGMA user_version = 2;")?;
    }

    Ok(())
}
