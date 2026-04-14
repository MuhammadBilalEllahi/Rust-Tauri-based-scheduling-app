export type SessionStatus = "active" | "paused" | "completed";

export interface Profile {
  id: string;
  name: string;
  color: string | null;
  dailyTargetMinutes: number | null;
  createdAt: number;
}

export interface Task {
  id: string;
  profileId: string;
  name: string;
  createdAt: number;
}

export interface TimerState {
  sessionId: string | null;
  profileId: string | null;
  profileName: string | null;
  taskId: string | null;
  taskName: string | null;
  status: SessionStatus | null;
  startedAt: number | null;
  displaySeconds: number;
  accumulatedSeconds: number;
  runningSince: number | null;
}

export interface ProfileDayRow {
  profileId: string;
  profileName: string;
  color: string | null;
  actualMinutes: number;
  targetMinutes: number | null;
  deltaMinutes: number | null;
}

export interface TaskDayRow {
  taskId: string;
  taskName: string;
  profileId: string;
  profileName: string;
  actualMinutes: number;
}

export interface DailySummary {
  date: string;
  totalActualMinutes: number;
  profiles: ProfileDayRow[];
  tasks: TaskDayRow[];
}
