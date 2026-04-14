import type { TodoItem } from "../types";

function timeFormatter(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateTimeFormatter(): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatInstant(utcMs: number): string {
  const d = new Date(utcMs);
  const now = new Date();
  if (isSameLocalDay(d, now)) {
    return timeFormatter().format(d);
  }
  return dateTimeFormatter().format(d);
}

function formatRelativeDay(utcMs: number): string {
  const d = new Date(utcMs);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startToday - startThat) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) {
    return "today";
  }
  if (diffDays === 1) {
    return "yesterday";
  }
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * One compact secondary line for scanning (muted typography in UI).
 */
export function formatTodoMetaSummary(todo: TodoItem, options?: { showRemoved?: boolean }): string {
  const parts: string[] = [];
  parts.push(`Created ${formatInstant(todo.createdAt)}`);

  if (todo.lastWorkedOnAt && todo.lastWorkedOnAt !== todo.createdAt) {
    const lw = formatRelativeDay(todo.lastWorkedOnAt);
    parts.push(`Worked on ${lw}`);
  }

  if (todo.status === "done" && todo.completedAt) {
    parts.push(`Done ${formatInstant(todo.completedAt)}`);
  }

  if (options?.showRemoved && todo.status === "removed" && todo.removedAt) {
    parts.push("Removed");
  }

  return parts.join(" · ");
}
