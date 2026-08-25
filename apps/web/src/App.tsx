import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { authClient } from "./auth-client";
import { DockPage } from "./pages/Dock";
import { LogPage } from "./pages/Log";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";

function Gate({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  if (session.isPending) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1>Stillwater</h1>
          <p className="lede">Fog lifting…</p>
        </div>
      </div>
    );
  }
  if (!session.data) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <Gate>
            <DockPage />
          </Gate>
        }
      />
      <Route
        path="/log"
        element={
          <Gate>
            <LogPage />
          </Gate>
        }
      />
    </Routes>
  );
}
