import { useEffect, useState } from "react";
import type { TodoItem } from "../../types";
import { TodoItemEditor } from "./TodoItemEditor";
import { TodoItemMeta } from "./TodoItemMeta";

type Props = {
  todo: TodoItem;
  variant: "compact" | "full";
  onToggle: (id: string, done: boolean) => void;
  onUpdate: (id: string, patch: { title?: string; notes?: string | null }) => void;
  onRemove: (id: string) => void;
};

export function TodoListItem({ todo, variant, onToggle, onUpdate, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(todo.notes ?? "");
  const done = todo.status === "done";

  useEffect(() => {
    setNoteDraft(todo.notes ?? "");
  }, [todo.notes, todo.id]);

  return (
    <div className={"todo-item" + (done ? " todo-item--done" : "")}>
      <label className="todo-item__check">
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => onToggle(todo.id, e.target.checked)}
          aria-label={done ? "Mark not done" : "Mark done"}
        />
      </label>
      <div className="todo-item__main">
        {editing ? (
          <TodoItemEditor
            initialTitle={todo.title}
            onSave={(title) => {
              onUpdate(todo.id, { title });
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <button
            type="button"
            className={"todo-item__title" + (done ? " todo-item__title--done" : "")}
            onClick={() => setEditing(true)}
          >
            {todo.title}
          </button>
        )}
        <TodoItemMeta todo={todo} />
        {variant === "full" && notesOpen ? (
          <textarea
            className="input todo-item-notes"
            rows={3}
            placeholder="Notes (optional)"
            value={noteDraft}
            aria-label="Task notes"
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => {
              const next = noteDraft.trim() || null;
              const cur = todo.notes?.trim() || null;
              if (next !== cur) {
                onUpdate(todo.id, { notes: next });
              }
            }}
          />
        ) : null}
      </div>
      <div className="todo-item__actions">
        {variant === "full" ? (
          <button
            type="button"
            className="btn btn-frost todo-item__action"
            title={notesOpen ? "Hide notes" : "Notes"}
            aria-expanded={notesOpen}
            onClick={() => setNotesOpen((v) => !v)}
          >
            {notesOpen ? "▾" : "▸"}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-frost todo-item__action"
          title="Edit title"
          aria-label="Edit title"
          onClick={() => setEditing(true)}
        >
          ✎
        </button>
        <button
          type="button"
          className="btn todo-item__action todo-item__action--danger"
          title="Remove"
          aria-label="Remove task"
          onClick={() => onRemove(todo.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}
