import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../api/tauri";
import { useSessionTimer } from "../hooks/useSessionTimer";
import type { Profile, Task, TimerState } from "../types";

export function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
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

  const refreshProfiles = useCallback(async () => {
    const list = await api.listProfiles();
    setProfiles(list);
    setSelectedProfileId((cur) => cur || list[0]?.id || "");
  }, []);

  const refreshSummary = useCallback(async () => {
    setSummary(await api.getDailySummary(today()));
  }, [today]);

  useEffect(() => {
    void (async () => {
      try {
        setError(null);
        await refreshProfiles();
        await refreshTimer();
        await refreshSummary();
      } catch (e) {
        setError(String(e));
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

  const hasSession = Boolean(timer?.sessionId);
  const isActive = timer?.status === "active";
  const isPaused = timer?.status === "paused";
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
      await refreshSummary();
    } catch (e) {
      setError(String(e));
    }
  }

  async function onPause() {
    try {
      setError(null);
      setTimer(await api.pauseSession());
      await refreshSummary();
    } catch (e) {
      setError(String(e));
    }
  }

  async function onResume() {
    try {
      setError(null);
      setTimer(await api.resumeSession());
    } catch (e) {
      setError(String(e));
    }
  }

  async function onStop() {
    try {
      setError(null);
      setTimer(await api.stopSession());
      await refreshSummary();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">
        Planned vs actual time — start a session from the timer when you are ready to work.
      </p>

      {error ? <p className="error">{error}</p> : null}

      <section className="card" aria-label="Session timer">
        <div className="timer-meta">
          {hasSession ? (
            <>
              <span className="chip">
                <span
                  className="chip-dot"
                  style={{
                    background:
                      profiles.find((p) => p.id === timer?.profileId)?.color ||
                      "var(--accent)",
                  }}
                />
                {timer?.profileName ?? "Profile"}
              </span>
              {timer?.taskName ? (
                <span className="chip" style={{ marginLeft: 8 }}>
                  {timer.taskName}
                </span>
              ) : (
                <span className="muted" style={{ marginLeft: 8 }}>
                  No task
                </span>
              )}
              <span className="muted" style={{ marginLeft: 12 }}>
                {isActive ? "Running" : isPaused ? "Paused" : ""}
              </span>
            </>
          ) : (
            <span className="muted">No active session</span>
          )}
        </div>

        <div className="timer-display">{format()}</div>

        <div className="row" style={{ marginBottom: 16 }}>
          <button className="btn btn-primary" type="button" disabled={!canStart} onClick={onStart}>
            Start
          </button>
          <button
            className="btn btn-frost"
            type="button"
            disabled={!isActive}
            onClick={onPause}
          >
            Pause
          </button>
          <button
            className="btn btn-frost"
            type="button"
            disabled={!isPaused}
            onClick={onResume}
          >
            Resume
          </button>
          <button
            className="btn btn-danger"
            type="button"
            disabled={!hasSession}
            onClick={onStop}
          >
            Stop
          </button>
        </div>

        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0, flex: "1 1 200px" }}>
            <label htmlFor="dash-profile">Profile</label>
            <select
              id="dash-profile"
              className="select"
              value={selectedProfileId}
              disabled={isActive || isPaused}
              onChange={(e) => {
                setSelectedProfileId(e.target.value);
                setSelectedTaskId("");
              }}
            >
              <option value="">Select profile…</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, flex: "1 1 200px" }}>
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
        <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>Today</h2>
        <p className="muted" style={{ margin: "0 0 12px", fontSize: 14 }}>
          Total tracked:{" "}
          <strong style={{ color: "var(--text)" }}>
            {summary ? `${summary.totalActualMinutes} min` : "—"}
          </strong>
          {" · "}
          <Link to="/report">Open daily report</Link>
        </p>
        {summary && summary.profiles.filter((p) => p.actualMinutes > 0).length > 0 ? (
          <div className="summary-grid">
            {summary.profiles
              .filter((p) => p.actualMinutes > 0)
              .slice(0, 4)
              .map((p) => (
                <div key={p.profileId} className="summary-card">
                  <h4>{p.profileName}</h4>
                  <p>{p.actualMinutes} min</p>
                  {p.targetMinutes != null ? (
                    <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                      Target {p.targetMinutes} min
                      {p.deltaMinutes != null ? ` · Δ ${p.deltaMinutes}` : ""}
                    </p>
                  ) : null}
                </div>
              ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            No time logged yet today.
          </p>
        )}
      </section>
    </div>
  );
}
