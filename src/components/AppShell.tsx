import { NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="app-root">
      <div className="app-body">
        <nav className="app-nav" aria-label="Main">
          <div className="app-brand">Time Accountability</div>
          <NavLink className={navClass} to="/" end>
            Dashboard
          </NavLink>
          <NavLink className={navClass} to="/profiles">
            Profiles
          </NavLink>
          <NavLink className={navClass} to="/tasks">
            Tasks
          </NavLink>
          <NavLink className={navClass} to="/report">
            Daily Report
          </NavLink>
        </nav>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return "nav-link" + (isActive ? " active" : "");
}
