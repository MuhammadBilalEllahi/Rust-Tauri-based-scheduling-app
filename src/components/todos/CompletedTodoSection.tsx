import type { ReactNode } from "react";

type Props = {
  title?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function CompletedTodoSection({
  title = "Completed",
  defaultOpen = true,
  children,
}: Props) {
  return (
    <details className="todo-completed-block" open={defaultOpen}>
      <summary className="todo-completed-summary">{title}</summary>
      <div className="todo-completed-body">{children}</div>
    </details>
  );
}
