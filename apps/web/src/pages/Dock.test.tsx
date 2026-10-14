// @vitest-environment jsdom
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { badgeProgress, dailyConditions, skyTurnForDay, fishById, lakeHour, lakeSeason, SKY_BLURB, weatherForDay, type FishSpecies, type LakeHour, type LodgeTrack, type Sky } from "@stillwater/shared";
import { getLodgeTracks, getMe, getSpeciesRecords, recordCatch, releaseCatch, type Me } from "../api";
import { readStoredLogbook } from "../field/storage";
import { fx } from "../game/fx";
import { sessionKey, startSession } from "../game/session";
import type { Outcome } from "../game/useFishingGame";

const scene = vi.fn<(props: { hour: LakeHour; sky: Sky; species?: FishSpecies | null; weight?: number; tracks?: readonly LodgeTrack[]; released?: boolean }) => void>();
const landed = vi.hoisted(() => ({ outcome: null as Outcome | null }));

vi.mock("../api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api")>()),
  getMe: vi.fn(),
  getSpeciesRecords: vi.fn(async () => []),
  getLodgeTracks: vi.fn(async () => []),
  recordCatch: vi.fn(),
  releaseCatch: vi.fn(),
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
vi.mock("../game/fx", () => ({ fx: { enabled: true, land: vi.fn(), haptic: vi.fn(), drag: { set: vi.fn(), stop: vi.fn() }, ambient: { start: vi.fn(), stop: vi.fn(), setConditions: vi.fn() } } }));
vi.mock("../game/scene/FishingWorld", () => ({
  FishingWorld: (props: { hour: LakeHour; sky: Sky; species?: FishSpecies | null; weight?: number; tracks?: readonly LodgeTrack[] }) => {
    scene(props);
    return null;
  },
}));

import { DockPage } from "./Dock";

const me: Me = {
  user: { id: "u1", email: "ash@stillwater.test", name: "Ash" },
  profile: { userId: "u1", displayName: "Ash", points: 0, lifetimePoints: 0, strength: 1, accuracy: 1, patience: 1 },
  level: 1,
  spots: { dock: true, reeds: true, point: true, dropoff: false, inlet: false, open: false },
  catches: [],
  speciesStats: [],
  badges: [],
  longestStreak: 0,
  recentDays: [],
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
  vi.mocked(fx.land).mockClear();
  vi.mocked(getMe).mockReset();
  vi.mocked(getSpeciesRecords).mockResolvedValue([]);
  vi.mocked(getLodgeTracks).mockResolvedValue([]);
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
  it("sends the ?sky= and ?season= overrides to the scene, the HUD, and the ambience", async () => {
    const page = await openDock("/?hour=night&sky=fog&season=winter");
    expect(lastScene()).toMatchObject({ hour: "night", sky: "fog", season: "winter" });
    expect(page.querySelector(".hud .eyebrow")?.textContent).toBe("Northern lake · Winter");
    expect(page.querySelector(".scene-wrap")?.getAttribute("data-sky")).toBe("fog");
    const chip = page.querySelector(".sky-chip");
    // Only the label sits in the HUD row; the blurb rides in the tooltip.
    expect(chip?.textContent).toBe("Fog");
    expect(chip?.getAttribute("title")).toBe(SKY_BLURB.fog);
    expect(fx.ambient.setConditions).toHaveBeenLastCalledWith("night", "fog", "winter");
  });

  it("names a full or new moon in the HUD eyebrow and sends the phase to the scene", async () => {
    const page = await openDock("/?hour=night&sky=clear&season=fall&moon=0.5");
    expect(page.querySelector(".hud .eyebrow")?.textContent).toBe("Northern lake · Fall · Full moon");
    expect((lastScene() as { moon?: number }).moon).toBe(0.5);
    act(() => root!.unmount());
    root = null;
    container?.remove();
    const crescent = await openDock("/?hour=night&sky=clear&season=fall&moon=0.15");
    expect(crescent.querySelector(".hud .eyebrow")?.textContent).toBe("Northern lake · Fall");
  });

  it("calls winter rain snow on the HUD, while the scene and the fish still read rain", async () => {
    const page = await openDock("/?hour=day&sky=rain&season=winter");
    expect(lastScene()).toMatchObject({ sky: "rain", season: "winter" });
    expect(page.querySelector(".sky-chip")?.textContent).toBe("Snow");
    expect(page.querySelector(".sky-chip")?.getAttribute("title")).toBe("Snow on the water. Pike and muskie hunt.");
  });

  it("uses the day's weather on the same clock as the hour without an override", async () => {
    const now = new Date(2026, 9, 8, 22, 15);
    vi.useFakeTimers({ toFake: ["Date"], now });
    const page = await openDock("/?sky=storm");
    const sky = weatherForDay(now);
    expect(lastScene()).toMatchObject({ hour: lakeHour(now), sky });
    expect(page.querySelector(".hud")?.getAttribute("data-sky")).toBe(sky);
    expect(lastScene()).toMatchObject({ season: lakeSeason(now) });
    expect(fx.ambient.setConditions).toHaveBeenLastCalledWith(lakeHour(now), sky, lakeSeason(now));
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
    expect(recordCatch).toHaveBeenLastCalledWith(expect.objectContaining({ requestId: "catch-dock-fog", hour: "day", sky: "fog" }));
  });
});

describe("dock scene fish", () => {
  it("shows the landed fish at its weight, and the fish that turned away on a missed strike", async () => {
    const perch = fishById("perch")!;
    landed.outcome = { kind: "miss", message: "Too slow.", fish: { species: perch, weight: 0.9 } };
    await openDock("/");
    expect(lastScene()).toMatchObject({ species: perch, weight: 0.9 });
    act(() => root?.unmount());
    container?.remove();

    const carp = fishById("carp")!;
    vi.mocked(recordCatch).mockResolvedValue({ id: "catch-carp", points: 1, speciesId: carp.id, weight: 11 });
    landed.outcome = { kind: "landed", id: "catch-carp", species: carp, weight: 11, spot: "dock", clean: false };
    await openDock("/");
    expect(lastScene()).toMatchObject({ species: carp, weight: 11 });
  });

  it("shows no fish after a cast that missed the water", async () => {
    landed.outcome = { kind: "miss", message: "Missed the lake." };
    await openDock("/");
    expect(lastScene()).toMatchObject({ species: null, weight: 0 });
  });
});

describe("level-up toast", () => {
  it("waits out the catch card, then fills a status region that was already mounted", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    const perch = fishById("perch")!;
    const levelThree: Me = {
      ...me,
      profile: { ...me.profile, points: 150, lifetimePoints: 150 },
      level: 3,
      spots: { ...me.spots, dropoff: true },
    };
    // The page load and the owner check before the save read level 1; the read after the save sees level 3.
    vi.mocked(getMe).mockResolvedValueOnce(me).mockResolvedValueOnce(me).mockResolvedValue(levelThree);
    vi.mocked(recordCatch).mockResolvedValue({ id: "catch-level", points: 150, speciesId: perch.id, weight: 0.6 });
    landed.outcome = { kind: "landed", id: "catch-level", species: perch, weight: 0.6, spot: "dock", clean: false };
    const page = await openDock("/");
    await act(async () => undefined);
    expect(page.querySelector(".level-chip")?.textContent).toBe("Level 3");
    expect(page.querySelector(".landed-card")).not.toBeNull();
    const status = page.querySelector(".level-status");
    expect(status?.getAttribute("role")).toBe("status");
    // A long look at the card must not use up the toast's time.
    act(() => vi.advanceTimersByTime(5000));
    expect(status?.textContent).toBe("");
    expect(fx.land).not.toHaveBeenCalled();

    landed.outcome = null;
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/"]}>
          <DockPage />
        </MemoryRouter>,
      );
    });
    expect(page.querySelector(".landed-card")).toBeNull();
    expect(page.querySelector(".level-status")).toBe(status);
    expect(status?.querySelector(".level-toast h2")?.textContent).toBe("Level 3");
    expect(status?.querySelector(".level-toast p")?.textContent).toBe("The drop-off is open — walk east along the shore.");
    expect(fx.land).toHaveBeenCalledTimes(1);

    // A quick recast hides it; coming back resumes the remaining time without a second chime.
    act(() => vi.advanceTimersByTime(2500));
    landed.outcome = { kind: "miss", message: "Too slow. The fish dropped the bait." };
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/"]}>
          <DockPage />
        </MemoryRouter>,
      );
    });
    expect(page.querySelector(".level-toast")).toBeNull();
    act(() => vi.advanceTimersByTime(10_000));
    landed.outcome = null;
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/"]}>
          <DockPage />
        </MemoryRouter>,
      );
    });
    expect(page.querySelector(".level-toast")).not.toBeNull();
    expect(fx.land).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1400));
    expect(page.querySelector(".level-toast")).not.toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(page.querySelector(".level-toast")).toBeNull();
    expect(page.querySelector(".level-status")).toBe(status);
  });
});

describe("lodge records", () => {
  it("stamps a catch that beats the lodge record with the weight and angler it beat", async () => {
    vi.mocked(getSpeciesRecords).mockResolvedValue([{ speciesId: "pike", weight: 12.3, userId: "mara", holder: "Mara", at: "2026-10-01T00:00:00Z" }]);
    vi.mocked(recordCatch).mockResolvedValue({ id: "catch-big-pike", points: 40, speciesId: "pike", weight: 13.1 });
    const page = await openDock("/?hour=dusk&sky=rain");
    await act(async () => undefined);
    landed.outcome = { kind: "landed", id: "catch-big-pike", species: fishById("pike")!, weight: 13.1, spot: "reeds", clean: false };
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/?hour=dusk&sky=rain"]}>
          <DockPage />
        </MemoryRouter>,
      );
    });
    const stamps = [...page.querySelectorAll(".landed-card .catch-stamp")].map((p) => p.textContent);
    expect(stamps).toContain("Lodge record · was 12.3 lb (Mara)");
    const pike = fishById("pike")!;
    expect(page.querySelector(".landed-card .guide-fish path")?.getAttribute("d")).toBe(pike.silhouette);
    expect(page.querySelector(".landed-card .guide-fish path")?.getAttribute("fill")).toBe(pike.color);
    expect(page.querySelector(".landed-card .catch-lore")?.textContent).toBe(pike.lore);
  });
});

describe("days on the water", () => {
  it("shows the run of days on the HUD and files the catch under today's local day", async () => {
    const today = new Date();
    const day = (back: number) => {
      const at = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
      return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`;
    };
    vi.mocked(getMe).mockResolvedValue({ ...me, recentDays: [day(3), day(2), day(1)], longestStreak: 3 });
    const perch = fishById("perch")!;
    vi.mocked(recordCatch).mockResolvedValue({ id: "catch-today", points: 1, speciesId: perch.id, weight: 0.6 });
    landed.outcome = { kind: "landed", id: "catch-today", species: perch, weight: 0.6, spot: "dock", clean: false };
    const page = await openDock("/?hour=day&sky=clear");
    await act(async () => undefined);
    expect(page.querySelector(".hud-streak")?.textContent).toBe("3 days in a row");
    expect(vi.mocked(recordCatch).mock.lastCall?.[0]).toMatchObject({ requestId: "catch-today", day: day(0) });
  });
});

describe("letting a fish go", () => {
  it("releases the landed fish from the card and drops it back in the scene", async () => {
    const perch = fishById("perch")!;
    vi.mocked(recordCatch).mockResolvedValue({ id: "catch-release", points: 1, speciesId: perch.id, weight: 0.6 });
    vi.mocked(releaseCatch).mockResolvedValue({ id: "catch-release", released: true });
    landed.outcome = { kind: "landed", id: "catch-release", species: perch, weight: 0.6, spot: "dock", clean: false };
    const page = await openDock("/?hour=day&sky=clear");
    await act(async () => undefined);
    const release = [...page.querySelectorAll(".landed-card button")].find((b) => b.textContent === "Release") as HTMLButtonElement;
    expect(release).toBeDefined();
    await act(async () => release.click());
    expect(releaseCatch).toHaveBeenCalledWith("catch-release");
    expect(page.querySelector(".landed-card .catch-stamp.released")?.textContent).toBe("Released back into the lake");
    expect([...page.querySelectorAll(".landed-card button")].some((b) => b.textContent === "Release")).toBe(false);
    expect(scene.mock.lastCall?.[0].released).toBe(true);
  });

  it("keeps the fish and says so when the release fails", async () => {
    const perch = fishById("perch")!;
    vi.mocked(recordCatch).mockResolvedValue({ id: "catch-stuck", points: 1, speciesId: perch.id, weight: 0.6 });
    vi.mocked(releaseCatch).mockRejectedValue(new Error("offline"));
    landed.outcome = { kind: "landed", id: "catch-stuck", species: perch, weight: 0.6, spot: "dock", clean: false };
    const page = await openDock("/?hour=day&sky=clear");
    await act(async () => undefined);
    const release = [...page.querySelectorAll(".landed-card button")].find((b) => b.textContent === "Release") as HTMLButtonElement;
    await act(async () => release.click());
    expect(page.querySelector(".landed-card .warn")?.textContent).toContain("could not be released");
    expect(scene.mock.lastCall?.[0].released).toBe(false);
  });
});

describe("packing up", () => {
  it("recaps the outing from the HUD and files it in the field log as a trip", async () => {
    const perch = fishById("perch")!;
    vi.mocked(recordCatch).mockResolvedValue({ id: "catch-trip", points: 3, speciesId: perch.id, weight: 0.7 });
    landed.outcome = { kind: "landed", id: "catch-trip", species: perch, weight: 0.7, spot: "dock", clean: true };
    const page = await openDock("/?hour=dusk&sky=fog");
    await act(async () => undefined);
    landed.outcome = null;
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/?hour=dusk&sky=fog"]}>
          <DockPage />
        </MemoryRouter>,
      );
    });
    const packUp = [...page.querySelectorAll<HTMLButtonElement>(".hud button")].find((b) => b.textContent === "Pack up");
    expect(packUp).toBeDefined();
    act(() => packUp!.click());
    const recap = document.querySelector(".trip-recap");
    expect(recap?.querySelector("h2")?.textContent).toBe("Dusk at the dock · fog");
    expect(recap?.querySelector(".trip-recap-stats")?.textContent).toContain("0.7 lb");
    act(() => [...recap!.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === "Write it in the book")!.click());
    const book = readStoredLogbook()!;
    const trip = book.trips.find((entry) => entry.title === "Dusk at the dock · fog");
    expect(trip).toBeDefined();
    expect(book.catches.find((entry) => entry.id === "catch-trip")?.tripId).toBe(trip!.id);
    expect(document.querySelector(".trip-recap-filed")?.textContent).toContain("Written in the book");
    act(() => [...document.querySelectorAll<HTMLButtonElement>(".trip-recap button")].find((b) => b.textContent === "Back to the lake")!.click());
    expect(document.querySelector(".trip-recap")).toBeNull();
    expect([...page.querySelectorAll(".hud button")].some((b) => b.textContent === "Pack up")).toBe(false);
  });

  it("offers yesterday's unfiled outing when the dock opens, and lets it go", async () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    const draft = {
      ...startSession(yesterday, "rain"),
      fish: [{ id: "old", speciesId: "pike", speciesName: "Northern pike", weight: 5, spot: "reeds" as const, hour: "night" as const, first: true, clean: false }],
    };
    localStorage.setItem(sessionKey("u1"), JSON.stringify(draft));
    await openDock("/?hour=day&sky=clear");
    await act(async () => undefined);
    const recap = document.querySelector(".trip-recap");
    expect(recap?.querySelector(".eyebrow")?.textContent).toBe("Your last trip");
    expect(recap?.querySelector(".trip-recap-firsts")?.textContent).toBe("New in the guide: Northern pike");
    act(() => [...recap!.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === "Let it go")!.click());
    expect(document.querySelector(".trip-recap")).toBeNull();
    expect(localStorage.getItem(sessionKey("u1"))).toBeNull();
  });
});

describe("shore tracks", () => {
  it("puts other anglers' recent catches on the water and names the latest on the bank", async () => {
    const track: LodgeTrack = { id: "t1", displayName: "Mara", speciesId: "pike", spot: "reeds", createdAt: new Date(Date.now() - 12 * 60_000 - 5_000).toISOString() };
    vi.mocked(getLodgeTracks).mockResolvedValue([track]);
    const page = await openDock("/?hour=day&sky=clear");
    await act(async () => undefined);
    expect(lastScene().tracks).toEqual([track]);
    expect(page.querySelector(".lodge-tracks p")?.textContent).toBe("Mara · northern pike · Reeds · 12 min ago");
  });
});

describe("dock badges", () => {
  it("names a badge the saved catch earned once the catch card is gone, then clears it", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    const pike = fishById("pike")!;
    const none = badgeProgress([]);
    const rainPike = badgeProgress([{ speciesId: "pike", spot: "reeds", hour: "dusk", sky: "rain", season: "fall", clean: false, golden: false, released: false, count: 1, heaviest: 4 }]);
    vi.mocked(getMe).mockResolvedValueOnce({ ...me, badges: none }).mockResolvedValueOnce({ ...me, badges: none }).mockResolvedValue({ ...me, badges: rainPike });
    vi.mocked(recordCatch).mockResolvedValue({ id: "catch-pike", points: 9, speciesId: pike.id, weight: 4 });
    landed.outcome = { kind: "landed", id: "catch-pike", species: pike, weight: 4, spot: "reeds", clean: false };
    const page = await openDock("/?hour=dusk&sky=rain");
    await act(async () => undefined);
    expect(page.querySelector(".badge-toast")).toBeNull();

    landed.outcome = null;
    await act(async () => {
      root!.render(
        <MemoryRouter initialEntries={["/?hour=dusk&sky=rain"]}>
          <DockPage />
        </MemoryRouter>,
      );
    });
    expect(page.querySelector(".level-status .badge-toast h2")?.textContent).toBe("Rain pike");
    expect(page.querySelector(".badge-toast p")?.textContent).toBe("Land a pike in the rain.");
    act(() => vi.advanceTimersByTime(4300));
    expect(page.querySelector(".badge-toast")).toBeNull();
  });
});

describe("touch play", () => {
  it("keeps the email off the play HUD", async () => {
    const page = await openDock("/?hour=day&sky=clear");
    expect(page.textContent).toContain("Ash");
    expect(page.textContent).not.toContain("ash@stillwater.test");
  });

  it("walks the angler to a bank from its signpost", async () => {
    const { anglerPose } = await import("../game/scene/pose");
    const page = await openDock("/?hour=day&sky=clear");
    const signs = [...page.querySelectorAll<HTMLButtonElement>(".walk-signs button")];
    // The angler starts the session at the shack, so the shop button leads the row.
    expect(signs.map((b) => b.textContent)).toEqual(["Open shop", "Dock", "Point", "Reeds", "Drop-off", "Shack"]);
    const reeds = signs.find((b) => b.textContent === "Reeds")!;
    act(() => reeds.click());
    const goal = anglerPose.route.at(-1);
    expect(goal).toBeDefined();
    expect(goal!.x).toBeLessThan(-13);
    anglerPose.route = [];
  });

  it("opens the shop from the HUD button at the shack", async () => {
    const page = await openDock("/?hour=day&sky=clear");
    const open = page.querySelector<HTMLButtonElement>(".walk-shop")!;
    act(() => open.click());
    const shop = page.querySelector(".shop-overlay")!;
    expect(shop).not.toBeNull();
    expect(shop.getAttribute("role")).toBe("dialog");
    expect(document.activeElement).toBe(shop);
    expect(page.querySelector(".walk-signs")).toBeNull();
    expect(page.querySelector(".hint")?.getAttribute("aria-live")).toBe("polite");
  });
});

describe("first-cast walkthrough", () => {
  it("greets a new angler with the aim chip lit, sending them to a bank first", async () => {
    const page = await openDock("/?hour=day&sky=clear");
    const chips = [...page.querySelectorAll(".walkthrough li")];
    expect(chips.map((chip) => chip.textContent)).toEqual(["Aim", "Charge", "Wait", "Strike", "Ease"]);
    expect(chips[0]!.getAttribute("data-state")).toBe("now");
    expect(page.querySelector(".walkthrough p")?.textContent).toMatch(/Walk onto a bank/);
    expect(page.querySelector(".scene-wrap")?.getAttribute("data-walkthrough")).toBe("1");
  });

  it("stays away once a fish is in the book or the angler skipped it", async () => {
    vi.mocked(getMe).mockResolvedValue({ ...me, speciesStats: [{ speciesId: "perch", caught: 1, heaviest: 0.5, lastAt: "2026-10-10T12:00:00.000Z" }] });
    let page = await openDock("/?hour=day&sky=clear");
    expect(page.querySelector(".walkthrough")).toBeNull();
    act(() => root?.unmount());
    container?.remove();

    vi.mocked(getMe).mockResolvedValue(me);
    page = await openDock("/?hour=day&sky=clear");
    act(() => page.querySelector<HTMLButtonElement>(".walkthrough-skip")!.click());
    expect(page.querySelector(".walkthrough")).toBeNull();
    expect(page.querySelector(".scene-wrap")?.hasAttribute("data-walkthrough")).toBe(false);
    act(() => root?.unmount());
    container?.remove();

    page = await openDock("/?hour=day&sky=clear");
    expect(page.querySelector(".walkthrough")).toBeNull();
  });

  it("sends off the first landed fish and never shows again", async () => {
    const perch = fishById("perch")!;
    vi.mocked(recordCatch).mockResolvedValue({ id: "catch-first", points: 1, speciesId: perch.id, weight: 0.6 });
    landed.outcome = { kind: "landed", id: "catch-first", species: perch, weight: 0.6, spot: "dock", clean: false };
    const page = await openDock("/?hour=day&sky=clear");
    expect(page.querySelector(".walkthrough")?.getAttribute("data-step")).toBe("landed");
    expect(page.querySelector(".walkthrough p")?.textContent).toMatch(/first fish/);
    expect([...page.querySelectorAll(".walkthrough li")].every((chip) => chip.getAttribute("data-state") === "done")).toBe(true);
    expect(localStorage.getItem("stillwater.walkthrough.u1.v1")).toBe("done");
  });
});

describe("settings", () => {
  it("opens from the HUD, takes focus, mutes the sound, and closes on Escape", async () => {
    const page = await openDock("/?hour=day&sky=clear");
    const gear = [...page.querySelectorAll<HTMLButtonElement>(".hud button")].find((b) => b.textContent === "Settings")!;
    act(() => gear.click());
    const dialog = page.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain("Reeling");
    expect(dialog.contains(document.activeElement)).toBe(true);
    const mute = [...dialog.querySelectorAll<HTMLLabelElement>("label")].find((l) => l.textContent?.includes("Mute all"))!;
    act(() => mute.querySelector("input")!.click());
    expect(fx.enabled).toBe(false);
    expect([...page.querySelectorAll(".hud button")].some((b) => b.textContent === "Sound")).toBe(true);
    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape" })));
    expect(page.querySelector('[role="dialog"]')).toBeNull();
    act(() => [...page.querySelectorAll<HTMLButtonElement>(".hud button")].find((b) => b.textContent === "Sound")!.click());
    expect(fx.enabled).toBe(true);
  });

  it("ties on last visit's lure when it is still packed", async () => {
    const { reloadSettings, updateSettings } = await import("../game/settings");
    const page = await openDock("/?hour=day&sky=clear");
    const options = [...page.querySelectorAll<HTMLOptionElement>(".lure-choice option")].map((o) => o.value);
    const last = options.at(-1)!;
    act(() => root?.unmount());
    container?.remove();
    updateSettings({ lastLure: last });
    const again = await openDock("/?hour=day&sky=clear");
    expect(again.querySelector<HTMLSelectElement>(".lure-choice select")?.value).toBe(last);
    expect(again.querySelector(".scene-wrap")?.getAttribute("data-lure")).toBe(last);
    localStorage.clear();
    reloadSettings();
  });
});

describe("dock lake hour", () => {
  it("turns the hour while you fish, under a veil that lifts again", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval", "setTimeout", "clearTimeout"], now: new Date(2026, 9, 8, 16, 59, 50) });
    const page = await openDock("/?sky=clear");
    expect(lastScene().hour).toBe("day");
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(page.querySelector(".hour-veil")?.textContent).toContain("Dusk settles on the water.");
    expect(lastScene().hour).toBe("day");
    await act(async () => {
      vi.advanceTimersByTime(1_200);
    });
    expect(lastScene().hour).toBe("dusk");
    expect(page.querySelector(".scene-wrap")?.getAttribute("data-hour")).toBe("dusk");
    await act(async () => {
      vi.advanceTimersByTime(2_100);
    });
    expect(page.querySelector(".hour-veil")).toBeNull();
  });

  it("lets the day's sky turn on its schedule, under the same veil, unless ?sky= pins it", async () => {
    const day = Array.from({ length: 90 }, (_, n) => new Date(2026, 9, 1 + n, 12)).find((d) => {
      const turn = skyTurnForDay(d);
      return turn !== null && weatherForDay(d) === "clear";
    })!;
    const turn = skyTurnForDay(day)!;
    vi.useFakeTimers({
      toFake: ["Date", "setInterval", "clearInterval", "setTimeout", "clearTimeout"],
      now: new Date(day.getFullYear(), day.getMonth(), day.getDate(), turn.hour - 1, 59, 50),
    });
    const page = await openDock("/?hour=day");
    expect(lastScene().sky).toBe("clear");
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(page.querySelector(".hour-veil")?.textContent).toContain("Clouds roll in over the lake.");
    await act(async () => {
      vi.advanceTimersByTime(1_200);
    });
    expect(lastScene().sky).toBe(turn.to);
    expect(page.querySelector(".scene-wrap")?.getAttribute("data-sky")).toBe(turn.to);
    act(() => root!.unmount());
    root = null;
    container?.remove();
    const pinned = await openDock("/?hour=day&sky=clear");
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(pinned.querySelector(".hour-veil")).toBeNull();
    expect(lastScene().sky).toBe("clear");
  });

  it("keeps a pinned ?hour= however long you stay", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval", "setTimeout", "clearTimeout"], now: new Date(2026, 9, 8, 16, 59, 50) });
    const page = await openDock("/?hour=day&sky=clear");
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(page.querySelector(".hour-veil")).toBeNull();
    expect(lastScene().hour).toBe("day");
  });
});
