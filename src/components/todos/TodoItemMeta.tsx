import type { TodoItem } from "../../types";
import { formatTodoMetaSummary } from "../../lib/todoMeta";

type Props = {
  todo: TodoItem;
  showRemoved?: boolean;
};

export function TodoItemMeta({ todo, showRemoved }: Props) {
  const text = formatTodoMetaSummary(todo, { showRemoved });
  return <p className="todo-item-meta muted">{text}</p>;
}
