import { useCallback, useEffect, useState } from "react";
import * as api from "../../api/tauri";
import type { TodoItem } from "../../types";

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setTodos(await api.listTodos(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { todos, loading, refresh };
}
