import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { prefetchMe } from "./api";
import { authClient } from "./auth-client";
import { useT } from "./i18n";
import { useRootSettings } from "./game/settings";
import { warmLake } from "./warmLake";
import { MapLoading, MapOffline } from "./field/map/MapOffline";
import { BestsPage } from "./field/bests/BestsPage";
import { SpeciesPage } from "./field/SpeciesPage";
import { NotFoundPage } from "./field/NotFoundPage";
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
import { StartPage } from "./pages/Start";

// The lake pulls in three.js and the models, so it and the pages around it load on demand:
// sign-in and the field log open without waiting for the 3D bundle.
const loadDock = () => import("./pages/Dock");
const DockPage = lazy(() => loadDock().then((module) => ({ default: module.DockPage })));
// Opened straight at the lake, its code and the angler's profile download while the sign-in check is still out, not after it.
if (window.location.pathname === "/play") {
  void loadDock().catch(() => undefined);
  prefetchMe();
}
const LogPage = lazy(() => import("./pages/Log").then((module) => ({ default: module.LogPage })));
const BoardPage = lazy(() => import("./pages/Board").then((module) => ({ default: module.BoardPage })));
const loadMap = () => import("./field/map/SpotMapPage");
// Offline, before the map was ever fetched, a short note instead of a blank app.
const SpotMapPage = lazy(() => loadMap().then((module) => ({ default: module.SpotMapPage }), () => ({ default: MapOffline })));

/** A short wait before the lake's pages: the sign-in check, then their code. */
function Waiting({ what }: { what: "sign-in" | "page" }) {
  const t = useT();
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>Stillwater</h1>
        <p className="lede" role="status">
          {what === "sign-in" ? t("Checking your sign-in…") : t("Loading…")}
        </p>
      </div>
    </main>
  );
}

function Offline() {
  const t = useT();
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>Stillwater</h1>
        <p className="lede">{t("You're offline. The lake needs a connection, but your field log works without one.")}</p>
        <p>
          <Link to="/book">{t("Open the field log")}</Link>
        </p>
      </div>
    </main>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const { pathname, search } = useLocation();
  if (session.isPending) return <Waiting what="sign-in" />;
  // Offline, the session check fails too; don't send a signed-in angler to the sign-in page.
  if (!session.data && !navigator.onLine) return <Offline />;
  // Signed in, the player comes back to the page asked for ("/board?tab=week"), not always the lake.
  if (!session.data) return <Navigate to="/login" replace state={{ from: pathname + search }} />;
  return <Suspense fallback={<Waiting what="page" />}>{children}</Suspense>;
}

function FieldLayout() {
  useEffect(() => {
    warmLake(loadDock);
    // The map's code too, while there is a connection, so it opens at the lake with none.
    const timer = setTimeout(() => void loadMap().catch(() => undefined), 4000);
    return () => clearTimeout(timer);
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
      <Route path="/" element={<StartPage loadLake={loadDock} />} />
      <Route element={<FieldLayout />}>
        <Route path="/book" element={<HomePage />} />
        <Route path="/catches" element={<CatchesPage />} />
        <Route path="/photos" element={<PhotosPage />} />
        <Route path="/catches/new" element={<CatchFormPage />} />
        <Route path="/catches/:catchId/edit" element={<CatchFormPage />} />
        <Route path="/catches/:catchId" element={<CatchPage />} />
        <Route path="/spots" element={<SpotsPage />} />
        <Route
          path="/map"
          element={
            <Suspense fallback={<MapLoading />}>
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
        <Route path="*" element={<NotFoundPage />} />
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
