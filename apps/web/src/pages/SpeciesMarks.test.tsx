// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FISH, fishById } from "@stillwater/shared";
import { getBoard, getMe, getSpeciesRecords, type Me } from "../api";
import { BoardPage } from "./Board";
import { LogPage } from "./Log";
import { GOLDEN_COLOR } from "../components/FishMark";

vi.mock("../api", () => ({ getBoard: vi.fn(), getMe: vi.fn(), getSpeciesRecords: vi.fn() }));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe("species marks on the lodge pages", () => {
  it("marks filled records and leaves unknown slots without a species silhouette", async () => {
    const pike = fishById("pike")!;
    vi.mocked(getBoard).mockResolvedValue({ period: "all", entries: [], you: null });
    vi.mocked(getSpeciesRecords).mockResolvedValue([
      { speciesId: pike.id, weight: 12.3, userId: "mara", holder: "Mara", at: "2026-10-01T00:00:00Z" },
    ]);
    await act(async () => {
      root.render(<MemoryRouter><BoardPage /></MemoryRouter>);
    });

    const wall = container.querySelector(".record-wall")!;
    expect(wall.querySelectorAll("svg")).toHaveLength(1);
    expect(wall.querySelector("path")?.getAttribute("d")).toBe(pike.silhouette);
    expect(wall.querySelector("path")?.getAttribute("fill")).toBe(pike.color);
    const empty = [...wall.querySelectorAll("li.empty")];
    expect(empty).toHaveLength(FISH.length - 1);
    for (const slot of empty) {
      expect(slot.textContent).toBe("UnknownNo one yet");
      expect(slot.querySelector("svg")).toBeNull();
    }
  });

  it("uses the caught species' mark on each log row and handles an unrecognised ID", async () => {
    const me: Me = {
      user: { id: "u1", email: "ash@stillwater.test", name: "Ash" },
      profile: { userId: "u1", displayName: "Ash", points: 0, lifetimePoints: 0, strength: 1, accuracy: 1, patience: 1 },
      level: 1,
      spots: { dock: true, reeds: true, point: true, dropoff: false, inlet: false, open: false },
      catches: ["pike", "catfish", "old-fish"].map((speciesId) => ({
        id: speciesId, userId: "u1", speciesId, weight: 4, points: 1, spot: "dock", hour: "dusk", sky: "clear", season: "fall", golden: false, released: false, createdAt: "2026-10-01T00:00:00Z",
      })),
      speciesStats: [],
      badges: [],
      longestStreak: 0,
      recentDays: [],
    };
    vi.mocked(getMe).mockResolvedValue(me);
    await act(async () => {
      root.render(<MemoryRouter><LogPage /></MemoryRouter>);
    });

    const rows = [...container.querySelectorAll("tbody tr")];
    expect(rows).toHaveLength(3);
    for (const [index, id] of ["pike", "catfish"].entries()) {
      const fish = fishById(id)!;
      expect(rows[index]!.querySelector("path")?.getAttribute("d")).toBe(fish.silhouette);
      expect(rows[index]!.querySelector("path")?.getAttribute("fill")).toBe(fish.color);
      expect(rows[index]!.querySelector("td")?.textContent).toBe(fish.name);
    }
    expect(rows[2]!.querySelector("svg")).toBeNull();
    expect(rows[2]!.querySelector("td")?.textContent).toBe("old-fish");
  });

  it("marks a golden catch in gold on the log", async () => {
    const pike = fishById("pike")!;
    vi.mocked(getMe).mockResolvedValue({
      user: { id: "u1", email: "ash@stillwater.test", name: "Ash" },
      profile: { userId: "u1", displayName: "Ash", points: 0, lifetimePoints: 0, strength: 1, accuracy: 1, patience: 1 },
      level: 1,
      spots: { dock: true, reeds: true, point: true, dropoff: false, inlet: false, open: false },
      catches: [{ id: "c1", userId: "u1", speciesId: "pike", weight: 4, points: 2, spot: "dock", hour: "dusk", sky: "clear", season: "fall", golden: true, released: false, createdAt: "2026-10-01T00:00:00Z" }],
      speciesStats: [],
      badges: [],
      longestStreak: 0,
      recentDays: [],
    });
    await act(async () => {
      root.render(<MemoryRouter><LogPage /></MemoryRouter>);
    });
    const cell = container.querySelector("tbody td")!;
    expect(cell.querySelector("path")?.getAttribute("fill")).toBe(GOLDEN_COLOR);
    expect(cell.querySelector("path")?.getAttribute("fill")).not.toBe(pike.color);
    expect(cell.querySelector(".log-golden")?.textContent).toBe("Golden");
  });
});
