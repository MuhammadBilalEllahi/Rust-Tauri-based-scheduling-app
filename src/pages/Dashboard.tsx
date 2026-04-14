import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../api/tauri";
import { useSessionTimer } from "../hooks/useSessionTimer";
import { mapSessionError } from "../lib/sessionErrors";
import type { Profile, Task, TimerState } from "../types";

export function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [quickProfileId, setQuickProfileId] = useState<string>("");
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof api.getDailySummary>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const { format } = useSessionTimer(timer);

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

  useEffect(() => {
    void (async () => {
      try {
        setError(null);
        const quickId = await api.getQuickSessionProfileId();
        setQuickProfileId(quickId);
        await refreshProfiles(quickId);
        await refreshTimer();
        await refreshSummary();
      } catch (e) {
        setError(mapSessionError(String(e)));
      }
    })();
  }, [refreshProfiles, refreshTimer, refreshSummary]);

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

  const needProfileHint =
    visibleProfiles.length > 0 && !selectedProfileId && !hasSession && !isActive && !isPaused;
  const profileRows = summary?.profiles.filter((profile) => profile.actualMinutes > 0) ?? [];
  const profileRowsVisible = profileRows.slice(0, 4);
  const profileRowsOverflow = Math.max(0, profileRows.length - profileRowsVisible.length);

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

      <section className="card" aria-label="Session timer">
        <div className="timer-display timer-display--hero">{format()}</div>
        <p className="timer-state-line">
          <span>{isActive ? "Running" : isPaused ? "Paused" : "Idle"}</span>
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
      </section>

      <section className="card" aria-label="Today preview">
        <h2 className="section-title-sm">Today</h2>
        <p className="muted" style={{ margin: "0 0 12px", fontSize: 13 }}>
          Total tracked:{" "}
          <strong style={{ color: "var(--text)" }}>
            {summary ? `${summary.totalActualMinutes} min` : "—"}
          </strong>
          {" · "}
          <Link to="/report">Daily report</Link>
        </p>
        {profileRows.length > 0 ? (
          <div className="snapshot-list">
            {profileRowsVisible.map((p) => (
              <div key={p.profileId} className="snapshot-row">
                <span className="snapshot-name">{p.profileName}</span>
                <span className="snapshot-value">{p.actualMinutes}m</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            No time logged yet today.
          </p>
        )}
        {profileRowsOverflow > 0 ? (
          <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>
            +{profileRowsOverflow} more profiles
          </p>
        ) : null}
      </section>
    </div>
  );
}
