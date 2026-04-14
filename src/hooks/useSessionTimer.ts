import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDurationHms } from "../lib/timeFormat";
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

  return { displaySeconds, format: (showMilliseconds = false) => formatDurationHms(displaySeconds, { showMilliseconds }), refresh };
}
