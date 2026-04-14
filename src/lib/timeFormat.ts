import type { TimezoneMode } from "../types";

export function formatDurationHms(
  totalSeconds: number,
  options?: { showMilliseconds?: boolean; millis?: number },
): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number, width = 2) => n.toString().padStart(width, "0");
  const base = `${pad(h)}:${pad(m)}:${pad(r)}`;
  if (!options?.showMilliseconds) {
    return base;
  }
  const millis = Math.max(0, options.millis ?? 0) % 1000;
  return `${base}.${pad(millis, 3)}`;
}

function resolveTimeZone(mode: TimezoneMode, id: string | null): string | undefined {
  if (mode === "manual" && id) {
    return id;
  }
  return undefined;
}

export function formatSessionInstant(
  utcMs: number | null,
  options: { timezoneMode: TimezoneMode; timezoneId: string | null; showTzLabel?: boolean },
): string {
  if (utcMs == null) {
    return "—";
  }
  const timeZone = resolveTimeZone(options.timezoneMode, options.timezoneId);
  const text = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date(utcMs));
  if (options.showTzLabel && options.timezoneMode === "manual" && options.timezoneId) {
    return `${text} (${options.timezoneId})`;
  }
  return text;
}

/** Local calendar date as `YYYY-MM-DD` (browser local timezone). */
export function formatLocalDateKey(utcMs: number): string {
  const d = new Date(utcMs);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatCurrentClock(showMilliseconds = false): string {
  const now = new Date();
  const base = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);
  if (!showMilliseconds) {
    return base;
  }
  const ms = now.getMilliseconds().toString().padStart(3, "0");
  return `${base}.${ms}`;
}
