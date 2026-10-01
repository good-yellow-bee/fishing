import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { authClient } from "./auth-client";
import { CatchFormPage, CatchesPage } from "./field/CatchPages";
import { FieldShell } from "./field/FieldShell";
import { HomePage } from "./field/HomePage";
import { LogbookProvider } from "./field/LogbookState";
import { SpotMapPage } from "./field/map/SpotMapPage";
import { SpotFormPage, SpotPage, SpotsPage } from "./field/SpotPages";
import { TripFormPage, TripPage, TripsPage } from "./field/TripPages";
import { BoardPage } from "./pages/Board";
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

function FieldLayout() {
  return (
    <LogbookProvider>
      <FieldShell>
        <Outlet />
      </FieldShell>
    </LogbookProvider>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<FieldLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catches" element={<CatchesPage />} />
        <Route path="/catches/new" element={<CatchFormPage />} />
        <Route path="/spots" element={<SpotsPage />} />
        <Route path="/map" element={<SpotMapPage />} />
        <Route path="/spots/new" element={<SpotFormPage />} />
        <Route path="/spots/:spotId" element={<SpotPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/new" element={<TripFormPage />} />
        <Route path="/trips/:tripId" element={<TripPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/play"
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
      <Route
        path="/board"
        element={
          <Gate>
            <BoardPage />
          </Gate>
        }
      />
    </Routes>
  );
}
