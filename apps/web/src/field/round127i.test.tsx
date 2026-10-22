// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { sampleLogbook, type CatchEntry, type Logbook, type Spot } from "@stillwater/shared";
import { SpotPage, SpotsPage } from "./SpotPages";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";
import { watersSummary } from "./summaries";
import { nearestPinned } from "./spotOrder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 21, 12));
  markFieldNewsSeen();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const water = (id: string, name: string, place?: { lat: number; lng: number }) => ({ id, name, waterType: "lake", notes: "", bestConditions: "", ...(place ? { place } : {}) }) as Spot;
const fish = (id: string, day: number, spotId: string): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure: "Jig", spotId, tripId: null, caughtAt: new Date(2026, 9, day, 7).toISOString(), note: "", weather: null }) as CatchEntry;

// Two waters 1.1 km apart (0.01° of latitude), a third far away, and one with no pin.
const book: Logbook = {
  spots: [water("a", "Cedar Bend", { lat: 46.85, lng: -94.24 }), water("b", "Mill Pond", { lat: 46.86, lng: -94.24 }), water("c", "Far Lake", { lat: 47.85, lng: -94.24 }), water("d", "Hidden")],
  trips: [],
  catches: [fish("1", 2, "a"), fish("2", 3, "a"), fish("3", 4, "b")],
};

async function show(path: string): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[path]}>
        <LogbookProvider>
          <TackleProvider>
            <Routes>
              <Route path="/spots" element={<SpotsPage />} />
              <Route path="/spots/:spotId" element={<SpotPage />} />
            </Routes>
          </TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

describe("round 127: Waters ideas", () => {
  it("finds the nearest pinned water, skipping unpinned ones", () => {
    const near = nearestPinned(book.spots[0]!.place!, book.spots.slice(1));
    expect(near?.spot.id).toBe("b");
    expect(near!.km).toBeGreaterThan(1);
    expect(near!.km).toBeLessThan(1.2);
    expect(nearestPinned({ lat: 0, lng: 0 }, [book.spots[3]!])).toBeNull();
  });

  it("names the nearest other water on a water's page, linked", async () => {
    const line = (await show("/spots/a")).querySelector(".nearest-water");
    expect(line?.textContent).toBe("Nearest water: 0.7 mi from Mill Pond");
    expect(line?.querySelector("a")?.getAttribute("href")).toBe("/spots/b");
  });

  it("counts a sample water the angler pinned", async () => {
    const pinned = { ...sampleLogbook(new Date()).spots[0]!, place: { lat: 46.851, lng: -94.24 } };
    book.spots.push(pinned);
    try {
      expect((await show("/spots/a")).querySelector(".nearest-water a")?.getAttribute("href")).toBe(`/spots/${pinned.id}`);
    } finally {
      book.spots.pop();
    }
  });

  it("says nothing on a water with no pin", async () => {
    expect((await show("/spots/d")).querySelector(".nearest-water")).toBeNull();
  });

  it("copies the listed waters as text", () => {
    const text = watersSummary([
      { spot: book.spots[0]!, fish: 2, outings: 1, lastFishDay: "2026-10-03" },
      { spot: book.spots[3]!, fish: 0, outings: 0, lastFishDay: null },
    ]);
    expect(text).toBe("2 waters\n- Cedar Bend · Lake · 2 fish · 1 outing · Last fish: Sat, Oct 3, 2026\n- Hidden · Lake · Nothing logged · 0 outings");
  });

  it("offers the copy on Waters beside the GPS file", async () => {
    const box = await show("/spots");
    expect([...box.querySelectorAll("button")].map((button) => button.textContent)).toContain("Copy a summary");
  });
});
