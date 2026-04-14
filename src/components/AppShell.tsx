import { getCurrentWindow } from "@tauri-apps/api/window";
import { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CompactRail } from "./CompactRail";
import { useCompanionLayout } from "../context/CompanionLayoutContext";
import { applyTheme, resolveTheme, type Theme } from "../lib/theme";

export function AppShell() {
  const { collapsed, toggleCollapsed } = useCompanionLayout();
  const [theme, setTheme] = useState<Theme>(() => resolveTheme());
  const windowControls = useMemo(() => getCurrentWindow(), []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  const onHideWindow = () => {
    void windowControls.hide();
  };

  const onMinimizeWindow = () => {
    void windowControls.minimize();
  };

  return (
    <div className={"app-root" + (collapsed ? " app-root--collapsed" : "")}>
      <div className="app-body">
        {!collapsed ? (
          <>
            <nav className="icon-rail" aria-label="Main">
              <div className="icon-rail-drag" data-tauri-drag-region aria-hidden />
              <button
                type="button"
                className="icon-rail-btn icon-rail-btn--window"
                onClick={onMinimizeWindow}
                title="Minimize window"
                aria-label="Minimize window"
              >
                — 
              </button>
              <button
                type="button"
                className="icon-rail-btn icon-rail-btn--window"
                onClick={onHideWindow}
                title="Hide window"
                aria-label="Hide window"
              >
                ✕
              </button>
              <button
                type="button"
                className="icon-rail-btn"
                onClick={toggleCollapsed}
                title="Collapse companion"
                aria-label="Collapse companion"
              >
                ◀
              </button>
              <NavLink className={navClass} to="/" end title="Overview" aria-label="Overview">
                <span aria-hidden>◎</span>
              </NavLink>
              <NavLink className={navClass} to="/profiles" title="Profiles" aria-label="Profiles">
                <span aria-hidden>◫</span>
              </NavLink>
              <NavLink className={navClass} to="/tasks" title="Tasks" aria-label="Tasks">
                <span aria-hidden>☰</span>
              </NavLink>
              <NavLink className={navClass} to="/todos" title="Todos" aria-label="Todos">
                <span aria-hidden>✓</span>
              </NavLink>
              <NavLink className={navClass} to="/execute" title="Execute" aria-label="Execute">
                <span aria-hidden>▶</span>
              </NavLink>
              <NavLink className={navClass} to="/report" title="Daily report" aria-label="Daily report">
                <span aria-hidden>▤</span>
              </NavLink>
              <NavLink className={navClass} to="/maintenance" title="Maintenance" aria-label="Maintenance">
                <span aria-hidden>⚙</span>
              </NavLink>
              <div className="icon-rail-spacer" />
              <button
                type="button"
                className="icon-rail-btn"
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              >
                {theme === "dark" ? "☼" : "☾"}
              </button>
            </nav>
            <main className="app-main">
              <Outlet />
            </main>
          </>
        ) : (
          <CompactRail />
        )}
      </div>
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return "icon-rail-link" + (isActive ? " active" : "");
}
