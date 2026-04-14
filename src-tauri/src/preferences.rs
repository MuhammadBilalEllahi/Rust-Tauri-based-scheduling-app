use std::collections::HashSet;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

const PREFS_KEY: &str = "app_preferences";

const OVERVIEW_SECTION_IDS: &[&str] = &[
    "timer",
    "today",
    "latestSession",
    "settings",
    "history",
    "todos",
];

fn default_overview_section_order() -> Vec<String> {
    OVERVIEW_SECTION_IDS.iter().copied().map(String::from).collect()
}

const UI_FONT_SCALE_MIN: i64 = 80;
const UI_FONT_SCALE_MAX: i64 = 140;

fn default_ui_font_scale_percent() -> i64 {
    100
}

fn default_app_mode() -> String {
    "v1".to_string()
}

fn clamp_ui_font_scale_percent(v: i64) -> i64 {
    v.clamp(UI_FONT_SCALE_MIN, UI_FONT_SCALE_MAX)
}

fn sanitize_overview_section_order(input: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for id in input {
        if OVERVIEW_SECTION_IDS.contains(&id.as_str()) && seen.insert(id.clone()) {
            out.push(id);
        }
    }
    for id in OVERVIEW_SECTION_IDS {
        if !seen.contains(*id) {
            out.push((*id).to_string());
        }
    }
    out
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPreferences {
    pub timezone_mode: String,
    pub timezone_id: Option<String>,
    pub show_milliseconds: bool,
    pub history_view_mode: String,
    #[serde(default = "default_overview_section_order")]
    pub overview_section_order: Vec<String>,
    #[serde(default = "default_ui_font_scale_percent")]
    pub ui_font_scale_percent: i64,
    #[serde(default = "default_app_mode")]
    pub app_mode: String,
}

impl Default for AppPreferences {
    fn default() -> Self {
        Self {
            timezone_mode: "auto".to_string(),
            timezone_id: None,
            show_milliseconds: false,
            history_view_mode: "calendar".to_string(),
            overview_section_order: default_overview_section_order(),
            ui_font_scale_percent: default_ui_font_scale_percent(),
            app_mode: default_app_mode(),
        }
    }
}

pub fn get_preferences(conn: &Connection) -> Result<AppPreferences, String> {
    let raw = conn
        .query_row(
            "SELECT value FROM app_kv WHERE key = ?1",
            params![PREFS_KEY],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    match raw {
        Some(json) => serde_json::from_str::<AppPreferences>(&json).map_err(|e| e.to_string()),
        None => {
            let prefs = AppPreferences::default();
            set_preferences(conn, prefs.clone())?;
            Ok(prefs)
        }
    }
}

pub fn set_preferences(conn: &Connection, input: AppPreferences) -> Result<AppPreferences, String> {
    let sanitized = AppPreferences {
        timezone_mode: if input.timezone_mode == "manual" {
            "manual".to_string()
        } else {
            "auto".to_string()
        },
        timezone_id: input.timezone_id.and_then(|id| {
            let trimmed = id.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }),
        show_milliseconds: input.show_milliseconds,
        history_view_mode: if input.history_view_mode == "list" {
            "list".to_string()
        } else {
            "calendar".to_string()
        },
        overview_section_order: sanitize_overview_section_order(input.overview_section_order),
        ui_font_scale_percent: clamp_ui_font_scale_percent(input.ui_font_scale_percent),
        app_mode: if input.app_mode == "v2" {
            "v2".to_string()
        } else {
            "v1".to_string()
        },
    };

    let raw = serde_json::to_string(&sanitized).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO app_kv (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![PREFS_KEY, raw],
    )
    .map_err(|e| e.to_string())?;
    Ok(sanitized)
}
