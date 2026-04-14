/** Map backend command errors to short UI copy (Phase 1). */
export function mapSessionError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("profile not found")) {
    return "That profile no longer exists. Pick another one.";
  }
  if (s.includes("task does not belong")) {
    return "This task does not belong to the selected profile.";
  }
  if (s.includes("already active or paused")) {
    return "A session is already open. Stop or resume it first.";
  }
  if (s.includes("not running")) {
    return "The timer is not running.";
  }
  if (s.includes("not paused")) {
    return "The timer is not paused.";
  }
  if (s.includes("no active session") || s.includes("no session")) {
    return "There is no session to change.";
  }
  if (s.includes("profile name is required")) {
    return "Please enter a profile name.";
  }
  if (s.includes("task name is required")) {
    return "Please enter a task name.";
  }
  if (s.includes("select a profile")) {
    return "Select a profile first.";
  }
  if (s.includes("task not found")) {
    return "That task no longer exists.";
  }
  if (s.includes("invalid date")) {
    return "Use a valid date (YYYY-MM-DD).";
  }
  return raw;
}
