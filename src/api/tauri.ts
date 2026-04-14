import { invoke } from "@tauri-apps/api/core";
import type {
  AppPreferences,
  DailySummary,
  DailyTotalRow,
  Profile,
  SessionHistoryRow,
  Task,
  MaintenanceResult,
  TimerState,
  TodoItem,
} from "../types";

export async function listProfiles(): Promise<Profile[]> {
  return invoke("list_profiles");
}

export async function createProfile(payload: {
  name: string;
  color?: string | null;
  dailyTargetMinutes?: number | null;
}): Promise<Profile> {
  return invoke("create_profile", {
    input: {
      name: payload.name,
      color: payload.color ?? null,
      dailyTargetMinutes: payload.dailyTargetMinutes ?? null,
    },
  });
}

export async function updateProfile(payload: {
  id: string;
  name: string;
  color?: string | null;
  dailyTargetMinutes?: number | null;
}): Promise<Profile> {
  return invoke("update_profile", {
    input: {
      id: payload.id,
      name: payload.name,
      color: payload.color ?? null,
      dailyTargetMinutes: payload.dailyTargetMinutes ?? null,
    },
  });
}

export async function deleteProfile(id: string): Promise<void> {
  return invoke("delete_profile", { id });
}

export async function listTasks(profileId: string): Promise<Task[]> {
  return invoke("list_tasks", { input: { profileId } });
}

export async function createTask(profileId: string, name: string): Promise<Task> {
  return invoke("create_task", { input: { profileId, name } });
}

export async function updateTask(id: string, name: string): Promise<Task> {
  return invoke("update_task", { input: { id, name } });
}

export async function deleteTask(id: string): Promise<void> {
  return invoke("delete_task", { id });
}

export async function getTimerState(): Promise<TimerState> {
  return invoke("get_timer_state");
}

export async function startSession(
  profileId: string,
  taskId?: string | null,
): Promise<TimerState> {
  return invoke("start_session", {
    input: { profileId, taskId: taskId ?? null },
  });
}

export async function pauseSession(): Promise<TimerState> {
  return invoke("pause_session");
}

export async function resumeSession(): Promise<TimerState> {
  return invoke("resume_session");
}

export async function stopSession(): Promise<TimerState> {
  return invoke("stop_session");
}

export async function startBreak(): Promise<TimerState> {
  return invoke("start_break");
}

export async function endBreak(): Promise<TimerState> {
  return invoke("end_break");
}

export async function updateSessionNotes(sessionId: string, notes: string | null): Promise<void> {
  return invoke("update_session_notes", {
    input: { sessionId, notes },
  });
}

export async function getDailySummary(date: string): Promise<DailySummary> {
  return invoke("get_daily_summary", { input: { date } });
}

export async function setCompanionCollapsed(collapsed: boolean): Promise<void> {
  return invoke("set_companion_collapsed", { collapsed });
}

export async function setLastQuickProfile(profileId: string): Promise<void> {
  return invoke("set_last_quick_profile", { input: { profileId } });
}

export async function getLastQuickProfile(): Promise<string | null> {
  return invoke("get_last_quick_profile");
}

export async function getQuickSessionProfileId(): Promise<string> {
  return invoke("get_quick_session_profile_id");
}

export async function getPreferences(): Promise<AppPreferences> {
  return invoke("get_preferences");
}

export async function setPreferences(input: AppPreferences): Promise<AppPreferences> {
  return invoke("set_preferences", { input });
}

export async function getHistoryDailyTotals(
  startDate: string,
  endDate: string,
): Promise<DailyTotalRow[]> {
  return invoke("get_history_daily_totals", { input: { startDate, endDate } });
}

export async function listSessionHistory(
  startDate?: string,
  endDate?: string,
): Promise<SessionHistoryRow[]> {
  return invoke("list_session_history", { input: { startDate: startDate ?? null, endDate: endDate ?? null } });
}

export async function listTodos(includeRemoved = false): Promise<TodoItem[]> {
  return invoke("list_todos", { input: { includeRemoved } });
}

export async function createTodo(payload: {
  title: string;
  notes?: string | null;
  sortIndex?: number | null;
}): Promise<TodoItem> {
  return invoke("create_todo", {
    input: {
      title: payload.title,
      notes: payload.notes ?? null,
      sortIndex: payload.sortIndex ?? null,
    },
  });
}

export async function updateTodo(payload: {
  id: string;
  title: string;
  notes?: string | null;
  lastWorkedOnAt?: number | null;
  sortIndex?: number | null;
}): Promise<TodoItem> {
  return invoke("update_todo", {
    input: {
      id: payload.id,
      title: payload.title,
      notes: payload.notes ?? null,
      lastWorkedOnAt: payload.lastWorkedOnAt ?? null,
      sortIndex: payload.sortIndex ?? null,
    },
  });
}

export async function toggleTodoDone(id: string, done: boolean): Promise<TodoItem> {
  return invoke("toggle_todo_done", { input: { id, done } });
}

export async function removeTodo(id: string): Promise<TodoItem> {
  return invoke("remove_todo", { id });
}

export async function clearPreferences(): Promise<MaintenanceResult> {
  return invoke("clear_preferences");
}

export async function clearTimerState(): Promise<MaintenanceResult> {
  return invoke("clear_timer_state");
}

export async function repairBreakSessions(): Promise<MaintenanceResult> {
  return invoke("repair_break_sessions");
}

export async function deleteSessionsInRange(
  startDate: string,
  endDate: string,
): Promise<MaintenanceResult> {
  return invoke("delete_sessions_in_range", { input: { startDate, endDate } });
}

export async function deleteAllSessions(): Promise<MaintenanceResult> {
  return invoke("delete_all_sessions");
}

export async function deleteAllTodos(): Promise<MaintenanceResult> {
  return invoke("delete_all_todos");
}

export async function fullResetAllData(): Promise<MaintenanceResult> {
  return invoke("full_reset_all_data");
}
