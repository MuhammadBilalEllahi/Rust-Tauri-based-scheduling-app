import { invoke } from "@tauri-apps/api/core";
import type { DailySummary, Profile, Task, TimerState } from "../types";

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

export async function getDailySummary(date: string): Promise<DailySummary> {
  return invoke("get_daily_summary", { input: { date } });
}
