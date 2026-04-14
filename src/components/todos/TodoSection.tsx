import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../../api/tauri";
import { mapSessionError } from "../../lib/sessionErrors";
import type { TodoItem } from "../../types";
import { CompletedTodoSection } from "./CompletedTodoSection";
import { TodoList } from "./TodoList";
import { TodoQuickAdd } from "./TodoQuickAdd";
import { useTodos } from "./useTodos";

const MAX_ACTIVE_COMPACT = 12;
const MAX_DONE_COMPACT = 6;

export type TodoFilter = "active" | "done" | "all";

type Props = {
  variant: "compact" | "full";
  onError?: (message: string) => void;
};

export function TodoSection({ variant, onError }: Props) {
  const { todos, loading, refresh } = useTodos();
  const [filter, setFilter] = useState<TodoFilter>("all");

  const { active, done } = useMemo(() => {
    const a: TodoItem[] = [];
    const d: TodoItem[] = [];
    for (const t of todos) {
      if (t.status === "active") {
        a.push(t);
      } else if (t.status === "done") {
        d.push(t);
      }
    }
    return { active: a, done: d };
  }, [todos]);

  const displayForFull = useMemo(() => {
    if (filter === "active") {
      return active;
    }
    if (filter === "done") {
      return done;
    }
    return todos;
  }, [filter, active, done, todos]);

  const activeCompact = useMemo(() => active.slice(0, MAX_ACTIVE_COMPACT), [active]);
  const doneCompact = useMemo(() => done.slice(0, MAX_DONE_COMPACT), [done]);

  async function handleQuickAdd(title: string) {
    try {
      await api.createTodo({ title });
      await refresh();
    } catch (e) {
      onError?.(mapSessionError(String(e)));
    }
  }

  async function handleToggle(id: string, doneToggle: boolean) {
    try {
      await api.toggleTodoDone(id, doneToggle);
      await refresh();
    } catch (e) {
      onError?.(mapSessionError(String(e)));
    }
  }

  async function handleUpdate(id: string, patch: { title?: string; notes?: string | null }) {
    const t = todos.find((x) => x.id === id);
    if (!t) {
      return;
    }
    try {
      await api.updateTodo({
        id,
        title: patch.title ?? t.title,
        notes: patch.notes !== undefined ? patch.notes : t.notes,
      });
      await refresh();
    } catch (e) {
      onError?.(mapSessionError(String(e)));
    }
  }

  async function handleRemove(id: string) {
    try {
      await api.removeTodo(id);
      await refresh();
    } catch (e) {
      onError?.(mapSessionError(String(e)));
    }
  }

  if (loading) {
    return <p className="muted todo-empty">Loading…</p>;
  }

  if (variant === "compact") {
    const showMore = active.length > MAX_ACTIVE_COMPACT || done.length > MAX_DONE_COMPACT;
    return (
      <div className="todo-section todo-section--compact">
        <TodoQuickAdd onSubmit={handleQuickAdd} placeholder="Add task, press Enter" />
        <div className="todo-subheading muted">Active</div>
        <TodoList
          todos={activeCompact}
          variant="compact"
          emptyMessage="No active tasks."
          onToggle={handleToggle}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
        {done.length > 0 ? (
          <CompletedTodoSection title={`Completed (${done.length})`} defaultOpen={done.length <= 6}>
            <TodoList
              todos={doneCompact}
              variant="compact"
              emptyMessage="No completed tasks."
              onToggle={handleToggle}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          </CompletedTodoSection>
        ) : (
          <p className="muted todo-empty" style={{ marginTop: 8 }}>
            No completed tasks yet.
          </p>
        )}
        {showMore ? (
          <p style={{ marginTop: 10, marginBottom: 0 }}>
            <Link to="/todos" className="todo-view-all">
              View all todos
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="todo-section todo-section--full">
      <TodoQuickAdd onSubmit={handleQuickAdd} placeholder="Add task, press Enter" />
      <div className="todo-filter-row" role="tablist" aria-label="Filter tasks">
        {(
          [
            ["all", "All"],
            ["active", "Active"],
            ["done", "Completed"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={"btn todo-filter-btn" + (filter === key ? " todo-filter-btn--on" : "")}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <TodoList
        todos={displayForFull}
        variant="full"
        emptyMessage={
          filter === "active"
            ? "No active tasks."
            : filter === "done"
              ? "No completed tasks."
              : "No tasks yet. Add one above."
        }
        onToggle={handleToggle}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
      />
    </div>
  );
}
