import { useCallback, useEffect, useMemo, useState } from "react";
import type { TimerState } from "../types";

function computeDisplaySeconds(state: TimerState | null, nowMs: number): number {
  if (!state?.status) {
    return state?.displaySeconds ?? 0;
  }
  if (state.status === "active" && state.runningSince != null) {
    const delta = Math.floor((nowMs - state.runningSince) / 1000);
    return Math.max(0, state.accumulatedSeconds + delta);
  }
  return state.accumulatedSeconds;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(r)}`;
}

export function useSessionTimer(state: TimerState | null) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const nowMs = useMemo(() => Date.now(), [tick, state]);

  const displaySeconds = useMemo(
    () => computeDisplaySeconds(state, nowMs),
    [state, nowMs, tick],
  );

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  return { displaySeconds, format: () => formatDuration(displaySeconds), refresh };
}
