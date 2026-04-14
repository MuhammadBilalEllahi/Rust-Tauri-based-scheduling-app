import { useState } from "react";
import { TodoSection } from "../components/todos/TodoSection";

export function TodosPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <h1 className="page-heading-soft">Todos</h1>
      <p className="page-sub">Quick capture, inline edit, completed tasks stay visible.</p>
      {error ? <p className="error">{error}</p> : null}
      <section className="card" aria-label="Tasks">
        <TodoSection variant="full" onError={setError} />
      </section>
    </div>
  );
}
