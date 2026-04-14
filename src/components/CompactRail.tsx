import { useCallback, useEffect, useState } from "react";
import * as api from "../api/tauri";
import { useSessionTimer } from "../hooks/useSessionTimer";
import { formatDurationHms } from "../lib/timeFormat";
import type { TimerState } from "../types";
import { useCompanionLayout } from "../context/CompanionLayoutContext";

export function CompactRail() {
  const { setCollapsed } = useCompanionLayout();
  const [timer, setTimer] = useState<TimerState | null>(null);
  const { displaySeconds } = useSessionTimer(timer);
  const parts = formatDurationHms(displaySeconds).split(":");

  const refresh = useCallback(async () => {
    const t = await api.getTimerState();
    setTimer(t);
  }, []);

  useEffect(() => {
    void refresh().catch(() => {});
    const id = window.setInterval(() => void refresh().catch(() => {}), 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const isActive = timer?.status === "active";
  const isPaused = timer?.status === "paused";

  const statusLabel = isActive ? "Running" : isPaused ? "Paused" : "Idle";

  return (
    <div
      className="compact-rail"
      role="button"
      tabIndex={0}
      aria-label="Expand companion"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return;
        }
        setCollapsed(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setCollapsed(false);
        }
      }}
    >
      <div className="compact-rail-inner">
        <div className="compact-status">{statusLabel}</div>
        <div className="compact-timer" aria-live="polite">
          {parts.length === 3 ? (
            <>
              <span className="compact-timer-line">{parts[0]}</span>
              <span className="compact-timer-line compact-timer-line--sm">
                {parts[1]}:{parts[2]}
              </span>
            </>
          ) : (
            <span className="compact-timer-line">{formatDurationHms(displaySeconds)}</span>
          )}
        </div>
        <div className="compact-pill">{isActive ? "Tracking" : isPaused ? "On hold" : "Ready"}</div>
        <button type="button" className="btn btn-frost compact-expand" onClick={() => setCollapsed(false)}>
          Expand
        </button>
      </div>
    </div>
  );
}
