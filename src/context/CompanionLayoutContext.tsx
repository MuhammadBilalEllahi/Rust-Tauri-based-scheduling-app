import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api/tauri";

const STORAGE_KEY = "companion_collapsed";

type CompanionLayoutValue = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggleCollapsed: () => void;
};

const CompanionLayoutContext = createContext<CompanionLayoutValue | null>(null);

export function CompanionLayoutProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsedState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (v) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (next) {
        navigate("/", { replace: true });
      }
      return next;
    });
  }, [navigate]);

  useLayoutEffect(() => {
    void api.setCompanionCollapsed(collapsed).catch(() => {
      /* window may not be ready in tests */
    });
  }, [collapsed]);

  const value = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggleCollapsed,
    }),
    [collapsed, setCollapsed, toggleCollapsed],
  );

  return (
    <CompanionLayoutContext.Provider value={value}>{children}</CompanionLayoutContext.Provider>
  );
}

export function useCompanionLayout() {
  const ctx = useContext(CompanionLayoutContext);
  if (!ctx) {
    throw new Error("useCompanionLayout must be used within CompanionLayoutProvider");
  }
  return ctx;
}
