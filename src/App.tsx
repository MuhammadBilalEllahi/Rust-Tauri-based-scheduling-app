import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { CompanionLayoutProvider } from "./context/CompanionLayoutContext";
import { DailyReport } from "./pages/DailyReport";
import { Dashboard } from "./pages/Dashboard";
import { Profiles } from "./pages/Profiles";
import { Tasks } from "./pages/Tasks";

export default function App() {
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
