import { useCallback, useEffect, useState } from "react";
import * as api from "../api/tauri";
import { mapSessionError } from "../lib/sessionErrors";
import type { DailySummary } from "../types";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DailyReport() {
  const [date, setDate] = useState(todayIso);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setSummary(await api.getDailySummary(date));
  }, [date]);

  useEffect(() => {
    void load().catch((e) => setError(mapSessionError(String(e))));
  }, [load]);

  return (
    <div>
      <h1 className="page-heading-soft">Daily report</h1>
      <p className="page-sub">Actual minutes per profile and task; compare to daily targets.</p>
      {error ? <p className="error">{error}</p> : null}

      <section className="card" aria-label="Date">
        <div className="field" style={{ marginBottom: 0, maxWidth: 280 }}>
          <label htmlFor="report-date">Date</label>
          <input
            id="report-date"
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </section>

      {summary ? (
        <>
          {summary.totalActualMinutes === 0 ? (
            <div className="empty-panel" style={{ marginBottom: 16 }}>
              No tracked time on this day yet. Start a session from the dashboard when you work.
            </div>
          ) : null}
          <section className="card" aria-label="Summary">
            <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>Overview</h2>
            <p style={{ margin: 0, fontSize: 15 }}>
              Total actual: <strong>{summary.totalActualMinutes} min</strong>
            </p>
          </section>

          <section className="card" aria-label="Profiles">
            <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>By profile</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Actual</th>
                  <th>Target</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                {summary.profiles.map((p) => (
                  <tr key={p.profileId}>
                    <td>
                      <span className="row" style={{ gap: 8 }}>
                        {p.color ? (
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              background: p.color,
                              display: "inline-block",
                              boxShadow: "0 0 0 1px var(--accent-ring)",
                            }}
                          />
                        ) : null}
                        {p.profileName}
                      </span>
                    </td>
                    <td>{p.actualMinutes} min</td>
                    <td>{p.targetMinutes != null ? `${p.targetMinutes} min` : "—"}</td>
                    <td>
                      {p.deltaMinutes != null ? (
                        <span
                          style={{
                            color:
                              p.deltaMinutes > 0
                                ? "#7dffb3"
                                : p.deltaMinutes < 0
                                  ? "#ffb4b4"
                                  : "var(--muted)",
                          }}
                        >
                          {p.deltaMinutes > 0 ? "+" : ""}
                          {p.deltaMinutes} min
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card" aria-label="Tasks">
            <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600 }}>By task</h2>
            {summary.tasks.length === 0 ? (
              <p className="muted">No task time for this day.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Profile</th>
                    <th>Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.tasks.map((t) => (
                    <tr key={t.taskId}>
                      <td>{t.taskName}</td>
                      <td className="muted">{t.profileName}</td>
                      <td>{t.actualMinutes} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
