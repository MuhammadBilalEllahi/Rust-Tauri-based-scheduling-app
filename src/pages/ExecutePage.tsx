import { useEffect, useMemo, useState } from "react";
import * as api from "../api/tauri";
import { useTodos } from "../components/todos/useTodos";
import { useSessionTimer } from "../hooks/useSessionTimer";
import { mapSessionError } from "../lib/sessionErrors";

export function ExecutePage() {
  const { todos, loading, refresh } = useTodos();
  const [quickProfileId, setQuickProfileId] = useState("");
  const [timer, setTimer] = useState<Awaited<ReturnType<typeof api.getTimerState>> | null>(null);
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);
  const [sessionNotesDraft, setSessionNotesDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { format } = useSessionTimer(timer);

  const activeTodos = useMemo(() => todos.filter((t) => t.status === "active"), [todos]);
  const activeTodo = useMemo(
    () => activeTodos.find((todo) => todo.id === activeTodoId) ?? null,
    [activeTodos, activeTodoId],
  );

  useEffect(() => {
    void (async () => {
      try {
        const [quickId, timerState] = await Promise.all([api.getQuickSessionProfileId(), api.getTimerState()]);
        setQuickProfileId(quickId);
        setTimer(timerState);
      } catch (e) {
        setError(mapSessionError(String(e)));
      }
    })();
  }, []);

  useEffect(() => {
    setSessionNotesDraft(timer?.sessionNotes ?? "");
  }, [timer?.sessionId, timer?.sessionNotes]);

  async function focusTodo(todoId: string) {
    if (!quickProfileId) {
      return;
    }
    try {
      setError(null);
      if (timer?.status) {
        await api.stopSession();
      }
      const t = await api.startSession(quickProfileId, null);
      setActiveTodoId(todoId);
      setTimer(t);
    } catch (e) {
      setError(mapSessionError(String(e)));
    }
  }

  async function onDoneNext() {
    if (!activeTodoId || !quickProfileId) {
      return;
    }
    try {
      setError(null);
      await api.toggleTodoDone(activeTodoId, true);
      if (timer?.status) {
        await api.stopSession();
      }
      const refreshedTodos = await api.listTodos(false);
      const remaining = refreshedTodos.filter((t) => t.status === "active" && t.id !== activeTodoId);
      await refresh();
      const next = remaining[0] ?? null;
      setActiveTodoId(next?.id ?? null);
      if (next) {
        setTimer(await api.startSession(quickProfileId, null));
      } else {
        setTimer(await api.getTimerState());
      }
    } catch (e) {
      setError(mapSessionError(String(e)));
    }
  }

  async function onSaveSessionNotes() {
    if (!timer?.sessionId) {
      return;
    }
    try {
      setError(null);
      await api.updateSessionNotes(timer.sessionId, sessionNotesDraft.trim() || null);
      setTimer((prev) => (prev ? { ...prev, sessionNotes: sessionNotesDraft.trim() || null } : prev));
    } catch (e) {
      setError(mapSessionError(String(e)));
    }
  }

  return (
    <div className="execute-layout">
      <section className="card execute-list-panel">
        <h2 className="section-title-sm">Execution list</h2>
        {loading ? <p className="muted">Loading todos...</p> : null}
        {!loading && activeTodos.length === 0 ? (
          <p className="muted">All done. Add tasks from the Todos tab.</p>
        ) : (
          <div className="todo-list-flat">
            {activeTodos.map((todo) => (
              <div
                key={todo.id}
                className={`todo-item ${activeTodoId === todo.id ? "execute-todo-row--active" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => void focusTodo(todo.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void focusTodo(todo.id);
                  }
                }}
              >
                <label className="todo-item__check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => void api.toggleTodoDone(todo.id, true).then(refresh)}
                    aria-label={`Mark ${todo.title} done`}
                  />
                </label>
                <div className="todo-item__main">
                  <div className="todo-item__title">{todo.title}</div>
                </div>
                <button className="btn btn-frost" type="button" onClick={() => void focusTodo(todo.id)}>
                  ▶ Focus
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card execute-focus-panel">
        <h2 className="section-title-sm">Active focus</h2>
        <p className="muted">{activeTodo?.title ?? "Pick a task from the execution list."}</p>
        <div className="timer-display">{format(false)}</div>
        <div className="icon-controls">
          <button
            className="btn btn-primary btn-icon"
            type="button"
            onClick={() => void (timer?.status === "paused" ? api.resumeSession().then(setTimer) : activeTodoId ? focusTodo(activeTodoId) : Promise.resolve())}
            disabled={!activeTodoId}
          >
            ▶
          </button>
          <button
            className="btn btn-frost btn-icon"
            type="button"
            disabled={timer?.status !== "active"}
            onClick={() => void api.pauseSession().then(setTimer)}
          >
            II
          </button>
          <button
            className="btn btn-danger btn-icon"
            type="button"
            disabled={!timer?.status}
            onClick={() => void api.stopSession().then(setTimer)}
          >
            ■
          </button>
          {timer?.sessionType === "break" ? (
            <button className="btn btn-end-break" type="button" onClick={() => void api.endBreak().then(setTimer)}>
              End Break
            </button>
          ) : (
            <button
              className="btn btn-break"
              type="button"
              disabled={timer?.status !== "active"}
              onClick={() => void api.startBreak().then(setTimer)}
            >
              ☕ Break
            </button>
          )}
        </div>
        <button className="btn btn-primary" type="button" disabled={!activeTodoId} onClick={() => void onDoneNext()}>
          ✓ Done + Next
        </button>
        {timer?.sessionId ? (
          <label className="field" style={{ marginTop: 12 }}>
            <span>Session note</span>
            <textarea
              className="input session-notes-field"
              rows={2}
              value={sessionNotesDraft}
              onChange={(e) => setSessionNotesDraft(e.target.value)}
              onBlur={() => void onSaveSessionNotes()}
              placeholder="Optional note for this session..."
            />
          </label>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </div>
  );
}
