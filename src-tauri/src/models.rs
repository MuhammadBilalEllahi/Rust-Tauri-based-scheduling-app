use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub daily_target_minutes: Option<i64>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub profile_id: String,
    pub name: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SessionStatus {
    Active,
    Paused,
    Completed,
}

impl SessionStatus {
    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "active" => Some(SessionStatus::Active),
            "paused" => Some(SessionStatus::Paused),
            "completed" => Some(SessionStatus::Completed),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerState {
    pub session_id: Option<String>,
    pub profile_id: Option<String>,
    pub profile_name: Option<String>,
    pub task_id: Option<String>,
    pub task_name: Option<String>,
    pub status: Option<SessionStatus>,
    pub started_at: Option<i64>,
    /// Server-computed display seconds at request time (for sync checks).
    pub display_seconds: i64,
    /// Banked seconds in DB; with `running_since` and `status` supports local UI ticks.
    pub accumulated_seconds: i64,
    pub running_since: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileDayRow {
    pub profile_id: String,
    pub profile_name: String,
    pub color: Option<String>,
    pub actual_minutes: i64,
    pub target_minutes: Option<i64>,
    pub delta_minutes: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDayRow {
    pub task_id: String,
    pub task_name: String,
    pub profile_id: String,
    pub profile_name: String,
    pub actual_minutes: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailySummary {
    pub date: String,
    pub total_actual_minutes: i64,
    pub profiles: Vec<ProfileDayRow>,
    pub tasks: Vec<TaskDayRow>,
}
