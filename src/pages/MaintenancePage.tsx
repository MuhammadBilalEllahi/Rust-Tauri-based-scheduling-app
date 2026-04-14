import { useState } from "react";
import * as api from "../api/tauri";
import { applyUiFontScalePercent } from "../lib/fontScale";
import { mapSessionError } from "../lib/sessionErrors";
import type { MaintenanceResult } from "../types";

type Status = { tone: "ok" | "error"; text: string } | null;

export function MaintenancePage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [resetAllConfirm, setResetAllConfirm] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  async function runAction(key: string, fn: () => Promise<MaintenanceResult>) {
    try {
      setBusy(key);
      setStatus(null);
      const res = await fn();
      setStatus({ tone: "ok", text: `${res.message} (${res.affectedRows})` });
      const prefs = await api.getPreferences().catch(() => null);
      if (prefs) {
        applyUiFontScalePercent(prefs.uiFontScalePercent);
      }
    } catch (e) {
      setStatus({ tone: "error", text: mapSessionError(String(e)) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="maintenance-page">
      <h1 className="page-title">Maintenance</h1>
      <p className="page-sub">
        Use these tools only when data looks wrong. Destructive actions cannot be undone.
      </p>

      {status ? (
        <p className={status.tone === "ok" ? "maintenance-status maintenance-status--ok" : "maintenance-status maintenance-status--error"}>
          {status.text}
        </p>
      ) : null}

      <section className="card maintenance-card">
        <h2 className="section-title-sm">Recovery actions</h2>
        <div className="maintenance-actions">
          <button className="btn btn-frost" type="button" disabled={Boolean(busy)} onClick={() => void runAction("clear-prefs", api.clearPreferences)}>
            Clear preferences cache
          </button>
          <button className="btn btn-frost" type="button" disabled={Boolean(busy)} onClick={() => void runAction("clear-timer", api.clearTimerState)}>
            Clear active timer state
          </button>
          <button className="btn btn-frost" type="button" disabled={Boolean(busy)} onClick={() => void runAction("repair-breaks", api.repairBreakSessions)}>
            Repair break/work links
          </button>
        </div>
      </section>

      <section className="card maintenance-card maintenance-card--danger">
        <h2 className="section-title-sm">Delete sessions by date range</h2>
        <div className="row">
          <label className="field" style={{ marginBottom: 0, flex: "1 1 180px" }}>
            <span>Start date</span>
            <input className="input" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
          </label>
          <label className="field" style={{ marginBottom: 0, flex: "1 1 180px" }}>
            <span>End date</span>
            <input className="input" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
          </label>
        </div>
        <button
          className="btn maintenance-btn-danger"
          type="button"
          disabled={Boolean(busy) || !rangeStart || !rangeEnd}
          onClick={() => void runAction("delete-range", () => api.deleteSessionsInRange(rangeStart, rangeEnd))}
        >
          Delete session range
        </button>
      </section>

      <section className="card maintenance-card maintenance-card--danger">
        <h2 className="section-title-sm">Danger zone</h2>
        <p className="muted">Type DELETE to enable permanent deletion actions.</p>
        <input
          className="input maintenance-confirm-input"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          placeholder="Type DELETE"
        />
        <div className="maintenance-actions">
          <button
            className="btn maintenance-btn-danger"
            type="button"
            disabled={Boolean(busy) || deleteConfirm !== "DELETE"}
            onClick={() => void runAction("delete-sessions", api.deleteAllSessions)}
          >
            Delete all sessions
          </button>
          <button
            className="btn maintenance-btn-danger"
            type="button"
            disabled={Boolean(busy) || deleteConfirm !== "DELETE"}
            onClick={() => void runAction("delete-todos", api.deleteAllTodos)}
          >
            Delete all todos
          </button>
        </div>
      </section>

      <section className="card maintenance-card maintenance-card--danger">
        <h2 className="section-title-sm">Full app reset</h2>
        <p className="muted">Type RESET ALL to remove sessions, todos, and cached app state.</p>
        <input
          className="input maintenance-confirm-input"
          value={resetAllConfirm}
          onChange={(e) => setResetAllConfirm(e.target.value)}
          placeholder="Type RESET ALL"
        />
        <button
          className="btn maintenance-btn-danger"
          type="button"
          disabled={Boolean(busy) || resetAllConfirm !== "RESET ALL"}
          onClick={() => void runAction("reset-all", api.fullResetAllData)}
        >
          Full reset all data
        </button>
      </section>
    </div>
  );
}
