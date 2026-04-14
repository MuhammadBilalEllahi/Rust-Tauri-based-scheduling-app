import type { TodoItem } from "../../types";
import { TodoListItem } from "./TodoListItem";

type Props = {
  todos: TodoItem[];
  variant: "compact" | "full";
  emptyMessage: string;
  onToggle: (id: string, done: boolean) => void;
  onUpdate: (id: string, patch: { title?: string; notes?: string | null }) => void;
  onRemove: (id: string) => void;
};

export function TodoList({
  todos,
  variant,
  emptyMessage,
  onToggle,
  onUpdate,
  onRemove,
}: Props) {
  if (todos.length === 0) {
    return <p className="muted todo-empty">{emptyMessage}</p>;
  }

  return (
    <div className="todo-list-flat" role="list">
      {todos.map((todo) => (
        <TodoListItem
          key={todo.id}
          todo={todo}
          variant={variant}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
