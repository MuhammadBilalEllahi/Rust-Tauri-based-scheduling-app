export type SessionStatus = "active" | "paused" | "completed";
export type TimezoneMode = "auto" | "manual";
export type HistoryViewMode = "calendar" | "list";

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
  timezoneMode: TimezoneMode | null;
  timezoneId: string | null;
}

export interface ProfileDayRow {
  profileId: string;
  profileName: string;
  color: string | null;
  actualMinutes: number;
  actualSeconds: number;
  targetMinutes: number | null;
  deltaMinutes: number | null;
}

export interface TaskDayRow {
  taskId: string;
  taskName: string;
  profileId: string;
  profileName: string;
  actualMinutes: number;
  actualSeconds: number;
}

export interface DailySummary {
  date: string;
  totalActualMinutes: number;
  totalActualSeconds: number;
  profiles: ProfileDayRow[];
  tasks: TaskDayRow[];
}

/** Stable keys for Overview / Dashboard card sections (persisted order). */
export type OverviewSectionId =
  | "timer"
  | "today"
  | "latestSession"
  | "settings"
  | "history"
  | "todos";

export const DEFAULT_OVERVIEW_SECTION_ORDER: readonly OverviewSectionId[] = [
  "timer",
  "today",
  "latestSession",
  "settings",
  "history",
  "todos",
];

export interface AppPreferences {
  timezoneMode: TimezoneMode;
  timezoneId: string | null;
  showMilliseconds: boolean;
  historyViewMode: HistoryViewMode;
  overviewSectionOrder: OverviewSectionId[];
  /** 80–140, default 100. Drives root font scale for the whole UI. */
  uiFontScalePercent: number;
}

export interface DailyTotalRow {
  date: string;
  totalSeconds: number;
  sessionCount: number;
}

export interface SessionHistoryRow {
  sessionId: string;
  profileId: string;
  profileName: string;
  taskId: string | null;
  taskName: string | null;
  startedAt: number;
  endedAt: number | null;
  durationSeconds: number;
  timezoneMode: TimezoneMode;
  timezoneId: string | null;
}

export type TodoStatus = "active" | "done" | "removed";

export interface TodoItem {
  id: string;
  title: string;
  notes: string | null;
  status: TodoStatus;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  removedAt: number | null;
  lastWorkedOnAt: number | null;
  sortIndex: number;
}
