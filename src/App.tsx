import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import * as api from "./api/tauri";
import { AppShell } from "./components/AppShell";
import { CompanionLayoutProvider } from "./context/CompanionLayoutContext";
import { applyUiFontScalePercent } from "./lib/fontScale";
import { DailyReport } from "./pages/DailyReport";
import { Dashboard } from "./pages/Dashboard";
import { Profiles } from "./pages/Profiles";
import { Tasks } from "./pages/Tasks";

export default function App() {
  useEffect(() => {
    void api
      .getPreferences()
      .then((p) => applyUiFontScalePercent(p.uiFontScalePercent))
      .catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <CompanionLayoutProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="profiles" element={<Profiles />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="report" element={<DailyReport />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CompanionLayoutProvider>
    </BrowserRouter>
  );
}
