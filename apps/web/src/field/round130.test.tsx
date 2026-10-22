// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, TackleItem, Trip } from "@stillwater/shared";
import { GearPage } from "./gear/GearPage";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { TACKLE_STORAGE_KEY } from "./gear/storage";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";
import { NearestWater } from "./NearestWater";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const water = (id: string, name: string, place?: { lat: number; lng: number }): Spot => ({ id, name, waterType: "lake", notes: "", bestConditions: "", ...(place ? { place } : {}) }) as Spot;
const trip = (id: string, date: string, spotId: string): Trip => ({ id, date, spotId, title: "", note: "" }) as Trip;
const fish = (id: string, tripId: string, spotId: string, day: number, lure: string): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure, spotId, tripId, caughtAt: new Date(2026, 9, day, 10).toISOString(), note: "", weather: null }) as CatchEntry;
const item = (id: string, tripId: string, label: string): TackleItem => ({ id, tripId, label, packed: true });

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 12));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function gear(book: Logbook, items: TackleItem[]): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  stored.set(TACKLE_STORAGE_KEY, JSON.stringify({ items }));
  markFieldNewsSeen();
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter>
        <LogbookProvider>
          <TackleProvider>
            <GearPage />
          </TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

// A named water and two with no name ("  " and ""), each with past outings and a Spoon packed.
const book: Logbook = {
  spots: [water("a", "Cedar Bend"), water("c", "  "), water("d", "")],
  trips: [trip("t1", "2026-09-01", "a"), trip("t2", "2026-09-05", "c"), trip("t3", "2026-09-10", "c"), trip("t4", "2026-09-15", "d"), trip("t5", "2026-10-30", "d")],
  catches: [fish("1", "t1", "a", 1, "Spoon"), fish("2", "t2", "c", 5, "Spoon"), fish("3", "t2", "c", 5, "Spoon"), fish("4", "t3", "c", 10, "Spoon"), fish("5", "t4", "d", 15, "Jig")],
};
const items = [item("i1", "t1", "Spoon"), item("i2", "t2", "Spoon"), item("i3", "t3", "Spoon"), item("i4", "t4", "Jig")];

describe("round 130 fixes: Tackle's lure record and a water with no name", () => {
  it("says no 'most at' for a lure whose fish came most at a water with no name, rather than a blank name", async () => {
    const box = await gear(book, items);
    const spoon = [...box.querySelectorAll(".lure-record li")].find((row) => row.textContent?.startsWith("Spoon"))!;
    expect(spoon.textContent).toContain("4 fish");
    expect(spoon.textContent).not.toContain("most at");
  });

  it("still names the leading water when the waters with no name trail it", async () => {
    const lead = { ...book, catches: [...book.catches, fish("6", "t1", "a", 1, "Spoon"), fish("7", "t1", "a", 1, "Spoon"), fish("8", "t1", "a", 1, "Spoon")] };
    const box = await gear(lead, items);
    const spoon = [...box.querySelectorAll(".lure-record li")].find((row) => row.textContent?.startsWith("Spoon"))!;
    expect(spoon.textContent).toContain("most at Cedar Bend (4)");
  });

  it("offers two waters with no name as two choices, each with its fish, each counting its own", async () => {
    const box = await gear(book, items);
    const choices = [...box.querySelectorAll(".spot-order button")].map((button) => button.textContent);
    expect(choices).toContain("Water with no name · 3 fish");
    expect(choices).toContain("Water with no name · 1 fish");
    const pick = [...box.querySelectorAll<HTMLButtonElement>(".spot-order button")].find((button) => button.textContent === "Water with no name · 3 fish")!;
    await act(async () => pick.click());
    const rows = [...box.querySelectorAll(".lure-record li")].map((row) => row.textContent);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain("3 fish · 2 outings");
  });

  it("names a lure without a dead search link while a water with no name is picked, and packs only for that water's outing", async () => {
    const box = await gear(book, items);
    const pick = [...box.querySelectorAll<HTMLButtonElement>(".spot-order button")].find((button) => button.textContent === "Water with no name · 3 fish")!;
    await act(async () => pick.click());
    const row = box.querySelector(".lure-record li")!;
    expect(row.querySelector("span")?.textContent).toBe("Spoon");
    expect([...box.querySelectorAll(".lure-record a")].some((link) => link.getAttribute("href")?.includes('water:""'))).toBe(false);
    // The next outing is on the other water with no name: no Pack for it from this one's record.
    expect(row.textContent).not.toContain("Pack for");
  });
});

describe("round 130 fixes: the nearest water to the angler", () => {
  it("names a pinned water with no name, never a bare ', right here.'", async () => {
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (done: (position: { coords: { latitude: number; longitude: number } }) => void) => done({ coords: { latitude: 46.9, longitude: -94.3 } }) } });
    const box = document.createElement("div");
    document.body.append(box);
    const pinned = { spots: [water("c", "  ", { lat: 46.9, lng: -94.3 })], trips: [], catches: [] } as Logbook;
    await act(async () => createRoot(box).render(<NearestWater book={pinned} onPick={() => {}} />));
    await act(async () => box.querySelector("button")!.click());
    expect(box.querySelector("[role=status]")?.textContent).toBe(" Water with no name, right here.");
  });
});
