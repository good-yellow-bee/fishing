// @vitest-environment jsdom
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dailyConditions, fishById, lakeHour, SKY_BLURB, weatherForDay, type LakeHour, type Sky } from "@stillwater/shared";
import { getMe, recordCatch, type Me } from "../api";
import { readStoredLogbook } from "../field/storage";
import { fx } from "../game/fx";
import type { Outcome } from "../game/useFishingGame";

const scene = vi.fn<(props: { hour: LakeHour; sky: Sky }) => void>();
const landed = vi.hoisted(() => ({ outcome: null as Outcome | null }));

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  getMe: vi.fn(),
  recordCatch: vi.fn(),
}));
// The real game loop, with a landed fish slipped in so the page saves it without playing a fight.
vi.mock("../game/useFishingGame", async (importOriginal) => {
  const real = await importOriginal<typeof import("../game/useFishingGame")>();
  return {
    ...real,
    useFishingGame: (...args: Parameters<typeof real.useFishingGame>) => {
      const game = real.useFishingGame(...args);
      return landed.outcome ? { ...game, outcome: landed.outcome } : game;
    },
  };
});
vi.mock("../auth-client", () => ({ authClient: { signOut: vi.fn() } }));
vi.mock("../game/fx", () => ({ fx: { enabled: true, ambient: { start: vi.fn(), stop: vi.fn(), setConditions: vi.fn() } } }));
vi.mock("../game/scene/FishingWorld", () => ({
  FishingWorld: (props: { hour: LakeHour; sky: Sky }) => {
    scene(props);
    return null;
  },
}));

import { DockPage } from "./Dock";

const me: Me = {
  user: { id: "u1", email: "ash@stillwater.test", name: "Ash" },
  profile: { userId: "u1", displayName: "Ash", points: 0, lifetimePoints: 0, strength: 1, accuracy: 1, patience: 1 },
  level: 1,
  spots: { dock: true, reeds: true, point: true, dropoff: false },
  catches: [],
  speciesStats: [],
};

// Node ships its own empty `localStorage` global, so borrow a real one.
const browser = new JSDOM("", { url: "http://localhost" });
afterAll(() => browser.window.close());

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  vi.stubGlobal("localStorage", browser.window.localStorage);
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.mocked(getMe).mockResolvedValue(me);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  landed.outcome = null;
  browser.window.localStorage.clear();
  scene.mockClear();
  vi.mocked(fx.ambient.setConditions).mockClear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function openDock(url: string) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <MemoryRouter initialEntries={[url]}>
        <DockPage />
      </MemoryRouter>,
    );
  });
  return container;
}

function lastScene() {
  return scene.mock.lastCall![0];
}

describe("dock weather", () => {
  it("sends the ?sky= override to the scene, the HUD, and the ambience", async () => {
    const page = await openDock("/?hour=night&sky=fog");
    expect(lastScene()).toMatchObject({ hour: "night", sky: "fog" });
    expect(page.querySelector(".scene-wrap")?.getAttribute("data-sky")).toBe("fog");
    const chip = page.querySelector(".sky-chip");
    // Only the label sits in the HUD row; the blurb rides in the tooltip.
    expect(chip?.textContent).toBe("Fog");
    expect(chip?.getAttribute("title")).toBe(SKY_BLURB.fog);
    expect(fx.ambient.setConditions).toHaveBeenLastCalledWith("night", "fog");
  });

  it("uses the day's weather on the same clock as the hour without an override", async () => {
    const now = new Date(2026, 9, 8, 22, 15);
    vi.useFakeTimers({ toFake: ["Date"], now });
    const page = await openDock("/?sky=storm");
    const sky = weatherForDay(now);
    expect(lastScene()).toMatchObject({ hour: lakeHour(now), sky });
    expect(page.querySelector(".hud")?.getAttribute("data-sky")).toBe(sky);
    expect(fx.ambient.setConditions).toHaveBeenLastCalledWith(lakeHour(now), sky);
  });

  it("writes the day's conditions into the field log with a landed fish", async () => {
    const now = new Date(2026, 9, 8, 14, 0);
    vi.useFakeTimers({ toFake: ["Date"], now });
    const perch = fishById("perch")!;
    vi.mocked(recordCatch).mockResolvedValue({ id: "catch-dock-fog", points: 1, speciesId: perch.id, weight: 0.6 });
    landed.outcome = { kind: "landed", id: "catch-dock-fog", species: perch, weight: 0.6, spot: "dock", clean: false };
    await openDock("/?sky=fog");
    const kept = readStoredLogbook()?.catches.find((entry) => entry.id === "catch-dock-fog");
    expect(kept?.weather).toEqual(dailyConditions(now, "fog"));
  });
});
