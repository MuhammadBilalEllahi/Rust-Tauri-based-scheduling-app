import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import * as api from "../api/tauri";
import { TodoSection } from "../components/todos/TodoSection";
import { useSessionTimer } from "../hooks/useSessionTimer";
import {
  formatCurrentClock,
  formatDurationHms,
  formatLocalDateKey,
  formatSessionInstant,
} from "../lib/timeFormat";
import { applyUiFontScalePercent } from "../lib/fontScale";
import { mapSessionError } from "../lib/sessionErrors";
import type {
  AppPreferences,
  DailyTotalRow,
  HistoryViewMode,
  OverviewSectionId,
  Profile,
  SessionHistoryRow,
  Task,
  TimerState,
} from "../types";
import { DEFAULT_OVERVIEW_SECTION_ORDER } from "../types";

function mergeOverviewSectionOrder(order: readonly string[] | undefined | null): OverviewSectionId[] {
  const known = new Set<string>(DEFAULT_OVERVIEW_SECTION_ORDER);
  const seen = new Set<string>();
  const out: OverviewSectionId[] = [];
  for (const raw of order ?? []) {
    if (known.has(raw) && !seen.has(raw)) {
      seen.add(raw);
      out.push(raw as OverviewSectionId);
    }
  }
  for (const id of DEFAULT_OVERVIEW_SECTION_ORDER) {
    if (!seen.has(id)) {
      out.push(id);
    }
  }
  return out;
}

const SECTION_ARIA: Record<OverviewSectionId, string> = {
  timer: "Session timer",
  today: "Today preview",
  latestSession: "Session details",
  settings: "Overview settings",
  history: "History",
  todos: "Todos",
};

const SECTION_TITLES: Record<OverviewSectionId, string | null> = {
  timer: null,
  today: "Today",
  latestSession: "Latest session",
  settings: "Settings",
  history: "History",
  todos: "Todos",
};

type SortableOverviewCardProps = {
  id: OverviewSectionId;
  children: ReactNode;
};

function SortableOverviewCard({ id, children }: SortableOverviewCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.92 : undefined,
  };
  const title = SECTION_TITLES[id];
  return (
    <section
      ref={setNodeRef}
      style={style}
      className="card overview-sortable-card"
      aria-label={SECTION_ARIA[id]}
    >
      <div
        className={
          title
            ? "overview-card-header"
            : "overview-card-header overview-card-header--timer-only"
        }
      >
        <button
          type="button"
          className="overview-section-drag-handle"
          aria-label={title ? `Drag to reorder: ${title}` : "Drag to reorder: session timer"}
          {...listeners}
          {...attributes}
        >
          ⋮⋮
        </button>
        {title ? <h2 className="section-title-sm overview-card-heading">{title}</h2> : null}
      </div>
      <div className="overview-card-body">{children}</div>
    </section>
  );
}

export function Dashboard() {
  const [preferences, setPreferencesState] = useState<AppPreferences | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [quickProfileId, setQuickProfileId] = useState<string>("");
  const [historyRows, setHistoryRows] = useState<SessionHistoryRow[]>([]);
  const [dailyTotals, setDailyTotals] = useState<DailyTotalRow[]>([]);
  const [currentClock, setCurrentClock] = useState(() => formatCurrentClock(false));
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof api.getDailySummary>> | null>(
    null,
  );
  const [sessionNotesDraft, setSessionNotesDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { format, displaySeconds } = useSessionTimer(timer);

  const sectionOrder = useMemo(
    () => mergeOverviewSectionOrder(preferences?.overviewSectionOrder),
    [preferences?.overviewSectionOrder],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const today = useCallback(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const refreshTimer = useCallback(async () => {
    const t = await api.getTimerState();
    setTimer(t);
    if (t.profileId) {
      setSelectedProfileId(t.profileId);
    }
    if (t.taskId) {
      setSelectedTaskId(t.taskId);
    } else if (t.status == null) {
      setSelectedTaskId("");
    }
  }, []);

  const refreshProfiles = useCallback(async (excludeProfileId?: string) => {
    const list = await api.listProfiles();
    const filtered = excludeProfileId ? list.filter((profile) => profile.id !== excludeProfileId) : list;
    setProfiles(filtered);
    setSelectedProfileId((cur) => cur || filtered[0]?.id || "");
  }, []);

  const refreshSummary = useCallback(async () => {
    setSummary(await api.getDailySummary(today()));
  }, [today]);

  const refreshHistory = useCallback(async () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 83);
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const [totals, sessions] = await Promise.all([
      api.getHistoryDailyTotals(fmt(start), fmt(end)),
      api.listSessionHistory(),
    ]);
    setDailyTotals(totals);
    setHistoryRows(sessions);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        setError(null);
        const [quickId, prefs] = await Promise.all([
          api.getQuickSessionProfileId(),
          api.getPreferences(),
        ]);
        setQuickProfileId(quickId);
        setPreferencesState(prefs);
        await refreshProfiles(quickId);
        await Promise.all([refreshTimer(), refreshSummary(), refreshHistory()]);
      } catch (e) {
        setError(mapSessionError(String(e)));
      }
    })();
  }, [refreshHistory, refreshProfiles, refreshSummary, refreshTimer]);

  useEffect(() => {
    const onFocus = () => {
      void refreshTimer();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshTimer]);

  useEffect(() => {
    if (!selectedProfileId) {
      setTasks([]);
      return;
    }
    void (async () => {
      try {
        setTasks(await api.listTasks(selectedProfileId));
      } catch {
        setTasks([]);
      }
    })();
  }, [selectedProfileId]);

  useEffect(() => {
    if (selectedTaskId && !tasks.some((t) => t.id === selectedTaskId)) {
      setSelectedTaskId("");
    }
  }, [tasks, selectedTaskId]);

  useEffect(() => {
    if (selectedProfileId) {
      void api.setLastQuickProfile(selectedProfileId).catch(() => {});
    }
  }, [selectedProfileId]);

  useEffect(() => {
    setSessionNotesDraft(timer?.sessionNotes ?? "");
  }, [timer?.sessionId, timer?.sessionNotes]);

  useEffect(() => {
    const id = window.setInterval(
      () => setCurrentClock(formatCurrentClock(Boolean(preferences?.showMilliseconds))),
      preferences?.showMilliseconds ? 100 : 1000,
    );
    return () => window.clearInterval(id);
  }, [preferences?.showMilliseconds]);

  const visibleProfiles = profiles;
  const hasSession = Boolean(timer?.sessionId);
  const isActive = timer?.status === "active";
  const isPaused = timer?.status === "paused";
  const isQuickSessionActive = Boolean(hasSession && timer?.profileId === quickProfileId);
  const canStart =
    Boolean(selectedProfileId) &&
    !hasSession &&
    (!selectedTaskId || tasks.some((t) => t.id === selectedTaskId));

  async function onStart() {
    try {
      setError(null);
      const t = await api.startSession(
        selectedProfileId,
        selectedTaskId || null,
      );
      setTimer(t);
      await api.setLastQuickProfile(selectedProfileId).catch(() => {});
      await refreshSummary();
    } catch (e) {
      setError(mapSessionError(String(e)));
    }
  }

  async function onPause() {
    try {
      setError(null);
      setTimer(await api.pauseSession());
      await refreshSummary();
    } catch (e) {
      setError(mapSessionError(String(e)));
    }
  }

  async function onResume() {
    try {
      setError(null);
      setTimer(await api.resumeSession());
    } catch (e) {
      setError(mapSessionError(String(e)));
    }
  }

  async function onStop() {
    try {
      setError(null);
      setTimer(await api.stopSession());
      await refreshSummary();
    } catch (e) {
      setError(mapSessionError(String(e)));
    }
  }

  async function onQuickSession() {
    if (!quickProfileId) {
      return;
    }
    try {
      setError(null);
      const t = await api.startSession(quickProfileId, null);
      setTimer(t);
      await refreshSummary();
    } catch (e) {
      setError(mapSessionError(String(e)));
    }
  }

  async function onStartBreak() {
    try {
      setError(null);
      setTimer(await api.startBreak());
    } catch (e) {
      setError(mapSessionError(String(e)));
    }
  }

  async function onEndBreak() {
    try {
      setError(null);
      setTimer(await api.endBreak());
    } catch (e) {
      setError(mapSessionError(String(e)));
    }
  }

  async function onSaveSessionNotes() {
    if (!timer?.sessionId) {
      return;
    }
    try {
      setError(null);
      await api.updateSessionNotes(timer.sessionId, sessionNotesDraft.trim() || null);
      setTimer((prev) => (prev ? { ...prev, sessionNotes: sessionNotesDraft.trim() || null } : prev));
    } catch (e) {
      setError(mapSessionError(String(e)));
    }
  }

  const needProfileHint =
    visibleProfiles.length > 0 && !selectedProfileId && !hasSession && !isActive && !isPaused;
  const profileRows = summary?.profiles.filter((profile) => profile.actualMinutes > 0) ?? [];
  const profileRowsVisible = profileRows.slice(0, 4);
  const profileRowsOverflow = Math.max(0, profileRows.length - profileRowsVisible.length);
  const latestSession = historyRows[0] ?? null;
  const todayDateStr = today();
  const sessionsTodayByProfile = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of historyRows) {
      if (formatLocalDateKey(h.startedAt) !== todayDateStr) {
        continue;
      }
      m.set(h.profileId, (m.get(h.profileId) ?? 0) + 1);
    }
    return m;
  }, [historyRows, todayDateStr]);
  const totalsByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of dailyTotals) {
      map.set(row.date, row.totalSeconds);
    }
    return map;
  }, [dailyTotals]);
  const historyMode: HistoryViewMode = preferences?.historyViewMode ?? "calendar";

  async function updatePreferences(next: AppPreferences) {
    const updated = await api.setPreferences(next);
    setPreferencesState(updated);
    applyUiFontScalePercent(updated.uiFontScalePercent);
  }

  const persistSectionOrder = useCallback(
    async (next: OverviewSectionId[]) => {
      try {
        const base = preferences ?? (await api.getPreferences());
        setPreferencesState(await api.setPreferences({ ...base, overviewSectionOrder: next }));
      } catch (e) {
        setError(mapSessionError(String(e)));
      }
    },
    [preferences],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const ids = [...sectionOrder];
    const oldIndex = ids.indexOf(active.id as OverviewSectionId);
    const newIndex = ids.indexOf(over.id as OverviewSectionId);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    void persistSectionOrder(arrayMove(ids, oldIndex, newIndex));
  }

  function renderOverviewSection(id: OverviewSectionId): ReactNode {
    switch (id) {
      case "timer":
        return (
          <>
            <div className="timer-display timer-display--hero">
              {format(Boolean(preferences?.showMilliseconds))}
            </div>
            <p className="timer-state-line">
              <span>
                {timer?.sessionType === "break" ? "Break" : isActive ? "Running" : isPaused ? "Paused" : "Idle"}
              </span>
              {" · "}
              <span>{isQuickSessionActive ? "Quick Session" : timer?.profileName ?? "No profile"}</span>
              {" · "}
              <span>{timer?.taskName ?? "No task"}</span>
            </p>

            <div className="icon-controls">
              <button
                className="btn btn-primary btn-icon"
                type="button"
                disabled={isActive || (!isPaused && !canStart)}
                onClick={isPaused ? onResume : onStart}
                title={isPaused ? "Resume" : "Start"}
                aria-label={isPaused ? "Resume session" : "Start session"}
              >
                ▶
              </button>
              <button
                className="btn btn-frost btn-icon"
                type="button"
                disabled={!isActive}
                onClick={onPause}
                title="Pause"
                aria-label="Pause session"
              >
                II
              </button>
              <button
                className="btn btn-danger btn-icon"
                type="button"
                disabled={!hasSession}
                onClick={onStop}
                title="Stop"
                aria-label="Stop session"
              >
                ■
              </button>
              {timer?.sessionType === "break" ? (
                <button
                  className="btn btn-end-break"
                  type="button"
                  disabled={!hasSession}
                  onClick={onEndBreak}
                  title="End break"
                  aria-label="End break"
                >
                  End Break
                </button>
              ) : (
                <button
                  className="btn btn-break"
                  type="button"
                  disabled={!isActive || timer?.sessionType !== "work"}
                  onClick={onStartBreak}
                  title="Start break"
                  aria-label="Start break"
                >
                  Break
                </button>
              )}
            </div>
            {!hasSession ? (
              <button
                type="button"
                className="btn btn-quick"
                disabled={!quickProfileId}
                onClick={onQuickSession}
              >
                Quick Session
              </button>
            ) : null}

            {needProfileHint ? <p className="hint">Choose a profile below before starting.</p> : null}

            <div className="row row--selectors">
              <div className="field" style={{ marginBottom: 0, flex: "1 1 120px" }}>
                <label htmlFor="dash-profile">Profile</label>
                <select
                  id="dash-profile"
                  className="select"
                  value={selectedProfileId}
                  disabled={isActive || isPaused}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedProfileId(v);
                    setSelectedTaskId("");
                  }}
                >
                  <option value="">Select profile…</option>
                  {visibleProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: "1 1 120px" }}>
                <label htmlFor="dash-task">Task (optional)</label>
                <select
                  id="dash-task"
                  className="select"
                  value={selectedTaskId}
                  disabled={!selectedProfileId || isActive || isPaused}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                >
                  <option value="">No task</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {hasSession ? (
              <label className="field" style={{ marginBottom: 0 }}>
                <span>Session note</span>
                <textarea
                  className="input session-notes-field"
                  rows={2}
                  value={sessionNotesDraft}
                  onChange={(e) => setSessionNotesDraft(e.target.value)}
                  onBlur={() => void onSaveSessionNotes()}
                  placeholder="Optional note for this session..."
                />
              </label>
            ) : null}
          </>
        );
      case "today":
        return (
          <>
            <p className="muted" style={{ margin: "0 0 12px", fontSize: "calc(13 / 14 * 1rem)" }}>
              Total tracked:{" "}
              <strong style={{ color: "var(--text)" }}>
                {summary ? formatDurationHms(summary.totalActualSeconds) : "—"}
              </strong>
              {" · "}
              <Link to="/report">Daily report</Link>
            </p>
            {profileRows.length > 0 ? (
              <div className="snapshot-list">
                {profileRowsVisible.map((p) => {
                  const n = sessionsTodayByProfile.get(p.profileId) ?? 0;
                  return (
                    <div key={p.profileId} className="snapshot-row">
                      <span className="snapshot-name">{p.profileName}</span>
                      <span className="snapshot-value">
                        {formatDurationHms(p.actualSeconds)}
                        {n > 1 ? (
                          <span className="muted snapshot-sessions-hint">
                            {" "}
                            ({n} sessions)
                          </span>
                        ) : null}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: "calc(13 / 14 * 1rem)" }}>
                No time logged yet today.
              </p>
            )}
            {profileRowsOverflow > 0 ? (
              <p className="muted" style={{ margin: "8px 0 0", fontSize: "calc(12 / 14 * 1rem)" }}>
                +{profileRowsOverflow} more profiles
              </p>
            ) : null}
          </>
        );
      case "latestSession":
        return latestSession ? (
          <div className="session-meta-list">
            <p className="muted">Profile: {latestSession.profileName}</p>
            <p className="muted">Task: {latestSession.taskName ?? "No task"}</p>
            <p className="muted">
              Start:{" "}
              {formatSessionInstant(latestSession.startedAt, {
                timezoneMode: latestSession.timezoneMode,
                timezoneId: latestSession.timezoneId,
                showTzLabel: true,
              })}
            </p>
            <p className="muted">
              End:{" "}
              {formatSessionInstant(latestSession.endedAt, {
                timezoneMode: latestSession.timezoneMode,
                timezoneId: latestSession.timezoneId,
                showTzLabel: true,
              })}
            </p>
            <p className="muted">Duration: {formatDurationHms(latestSession.durationSeconds)}</p>
          </div>
        ) : (
          <p className="muted">No completed sessions yet.</p>
        );
      case "settings":
        return preferences ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="row">
              <label className="field" style={{ marginBottom: 0, flex: "1 1 120px" }}>
                <span>Timezone mode</span>
                <select
                  className="select"
                  value={preferences.timezoneMode}
                  onChange={(e) =>
                    void updatePreferences({
                      ...preferences,
                      timezoneMode: e.target.value === "manual" ? "manual" : "auto",
                    })
                  }
                >
                  <option value="auto">Auto (system)</option>
                  <option value="manual">Manual</option>
                </select>
              </label>
              <label className="field" style={{ marginBottom: 0, flex: "1 1 160px" }}>
                <span>Manual timezone</span>
                <input
                  className="input"
                  disabled={preferences.timezoneMode !== "manual"}
                  value={preferences.timezoneId ?? ""}
                  onChange={(e) => {
                    const timezoneId = e.target.value.trim() || null;
                    void updatePreferences({ ...preferences, timezoneId });
                  }}
                  placeholder="e.g. Asia/Karachi"
                />
              </label>
              <label className="field" style={{ marginBottom: 0, flex: "1 1 120px" }}>
                <span>History view</span>
                <select
                  className="select"
                  value={preferences.historyViewMode}
                  onChange={(e) =>
                    void updatePreferences({
                      ...preferences,
                      historyViewMode: e.target.value === "list" ? "list" : "calendar",
                    })
                  }
                >
                  <option value="calendar">Calendar</option>
                  <option value="list">List</option>
                </select>
              </label>
              <label className="field checkbox-field" style={{ marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={preferences.showMilliseconds}
                  onChange={(e) =>
                    void updatePreferences({ ...preferences, showMilliseconds: e.target.checked })
                  }
                />
                <span>Show milliseconds</span>
              </label>
              <label className="field" style={{ marginBottom: 0, flex: "1 1 140px" }}>
                <span>App mode</span>
                <select
                  className="select"
                  value={preferences.appMode}
                  onChange={(e) =>
                    void updatePreferences({
                      ...preferences,
                      appMode: e.target.value === "v2" ? "v2" : "v1",
                    })
                  }
                >
                  <option value="v1">V1 - Flexible</option>
                  <option value="v2">V2 - Execution</option>
                </select>
              </label>
            </div>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>UI font size</span>
              <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "nowrap" }}>
                <input
                  type="range"
                  className="font-scale-slider"
                  min={80}
                  max={140}
                  step={5}
                  value={preferences.uiFontScalePercent}
                  onChange={(e) =>
                    void updatePreferences({
                      ...preferences,
                      uiFontScalePercent: Number(e.target.value),
                    })
                  }
                  aria-valuemin={80}
                  aria-valuemax={140}
                  aria-valuenow={preferences.uiFontScalePercent}
                  aria-label="UI font size percentage"
                />
                <span className="muted" style={{ minWidth: "3.2rem", fontVariantNumeric: "tabular-nums" }}>
                  {preferences.uiFontScalePercent}%
                </span>
              </div>
            </label>
          </div>
        ) : null;
      case "history":
        return historyMode === "calendar" ? (
          <div className="heatmap-grid">
            {Array.from({ length: 84 }).map((_, idx) => {
              const date = new Date();
              date.setDate(date.getDate() - (83 - idx));
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
              const seconds = totalsByDate.get(key) ?? 0;
              const level = seconds === 0 ? 0 : Math.min(4, Math.floor(seconds / 3600) + 1);
              return (
                <span
                  key={key}
                  className={`heatmap-cell heatmap-level-${level}`}
                  title={`${key}: ${formatDurationHms(seconds)}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="history-list">
            {historyRows.length === 0 ? (
              <p className="muted">No history yet.</p>
            ) : (
              historyRows.map((row) => (
                <div key={row.sessionId} className="history-row history-row--session">
                  <span className="history-session-start">
                    {formatSessionInstant(row.startedAt, {
                      timezoneMode: row.timezoneMode,
                      timezoneId: row.timezoneId,
                      showTzLabel: true,
                    })}
                  </span>
                  <span className="history-session-profile muted">
                    {row.profileName}
                    {row.taskName ? ` · ${row.taskName}` : ""}
                  </span>
                  <span className="history-session-duration">{formatDurationHms(row.durationSeconds)}</span>
                </div>
              ))
            )}
          </div>
        );
      case "todos":
        return <TodoSection variant="compact" onError={(msg) => setError(msg)} />;
      default: {
        const _exhaustive: never = id;
        return _exhaustive;
      }
    }
  }

  return (
    <div className="dashboard">
      {visibleProfiles.length === 0 ? (
        <div className="empty-panel">
          Create a work profile first, then come back here to start tracking.
          <div style={{ marginTop: 10 }}>
            <Link to="/profiles">Go to Profiles</Link>
          </div>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          {sectionOrder.map((id) => (
            <SortableOverviewCard key={id} id={id}>
              {renderOverviewSection(id)}
            </SortableOverviewCard>
          ))}
        </SortableContext>
      </DndContext>

      <footer className="overview-clock muted">
        {currentClock} · Local · {formatDurationHms(displaySeconds)}
      </footer>
    </div>
  );
}
