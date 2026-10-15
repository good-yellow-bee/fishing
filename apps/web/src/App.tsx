import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { authClient } from "./auth-client";
import { useT } from "./i18n";
import { useRootSettings } from "./game/settings";
import { warmLake } from "./warmLake";
import { BestsPage } from "./field/bests/BestsPage";
import { SpeciesPage } from "./field/SpeciesPage";
import { CatchFormPage, CatchPage, CatchesPage } from "./field/CatchPages";
import { FieldShell } from "./field/FieldShell";
import { GearPage } from "./field/gear/GearPage";
import { TackleProvider } from "./field/gear/TackleState";
import { HomePage } from "./field/HomePage";
import { PhotosPage } from "./field/PhotosPage";
import { LogbookProvider } from "./field/LogbookState";
import { SpotFormPage, SpotPage, SpotsPage } from "./field/SpotPages";
import { TripFormPage, TripPage, TripsPage } from "./field/TripPages";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";

// The lake pulls in three.js and the models, so it and the pages around it load on demand:
// sign-in and the field log open without waiting for the 3D bundle.
const loadDock = () => import("./pages/Dock");
const DockPage = lazy(() => loadDock().then((module) => ({ default: module.DockPage })));
const LogPage = lazy(() => import("./pages/Log").then((module) => ({ default: module.LogPage })));
const BoardPage = lazy(() => import("./pages/Board").then((module) => ({ default: module.BoardPage })));
const SpotMapPage = lazy(() => import("./field/map/SpotMapPage").then((module) => ({ default: module.SpotMapPage })));

function FogLifting() {
  const t = useT();
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Stillwater</h1>
        <p className="lede">{t("Fog lifting…")}</p>
      </div>
    </div>
  );
}

function Offline() {
  const t = useT();
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Stillwater</h1>
        <p className="lede">{t("You're offline. The lake needs a connection, but your field log works without one.")}</p>
        <p>
          <Link to="/">{t("Open the field log")}</Link>
        </p>
      </div>
    </div>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  if (session.isPending) return <FogLifting />;
  // Offline, the session check fails too; don't send a signed-in angler to the sign-in page.
  if (!session.data && !navigator.onLine) return <Offline />;
  if (!session.data) return <Navigate to="/login" replace />;
  return <Suspense fallback={<FogLifting />}>{children}</Suspense>;
}

function FieldLayout() {
  useEffect(() => {
    warmLake(loadDock);
  }, []);
  return (
    <LogbookProvider>
      <TackleProvider>
        <FieldShell>
          <Outlet />
        </FieldShell>
      </TackleProvider>
    </LogbookProvider>
  );
}

export function App() {
  useRootSettings();
  return (
    <Routes>
      <Route element={<FieldLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catches" element={<CatchesPage />} />
        <Route path="/photos" element={<PhotosPage />} />
        <Route path="/catches/new" element={<CatchFormPage />} />
        <Route path="/catches/:catchId/edit" element={<CatchFormPage />} />
        <Route path="/catches/:catchId" element={<CatchPage />} />
        <Route path="/spots" element={<SpotsPage />} />
        <Route
          path="/map"
          element={
            <Suspense fallback={null}>
              <SpotMapPage />
            </Suspense>
          }
        />
        <Route path="/spots/new" element={<SpotFormPage />} />
        <Route path="/spots/:spotId/edit" element={<SpotFormPage />} />
        <Route path="/spots/:spotId" element={<SpotPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/new" element={<TripFormPage />} />
        <Route path="/trips/:tripId/edit" element={<TripFormPage />} />
        <Route path="/trips/:tripId" element={<TripPage />} />
        <Route path="/gear" element={<GearPage />} />
        <Route path="/gear/:tripId" element={<GearPage />} />
        <Route path="/bests" element={<BestsPage />} />
        <Route path="/species/:species" element={<SpeciesPage />} />
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
