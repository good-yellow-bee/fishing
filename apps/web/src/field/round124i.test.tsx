// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { TripFormPage, TripPage, TripsPage } from "./TripPages";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { NEWS_ITEMS } from "../game/whatsNew";
import { FIELD_NEWS } from "./fieldNews";
import { PL_GAME } from "../i18n/pl/game";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 21, 12));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function page(book: Logbook, path: string): Promise<string> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[path]}>
        <LogbookProvider>
          <TackleProvider>
            <Routes>
              <Route path="/trips" element={<TripsPage />} />
              <Route path="/trips/new" element={<TripFormPage />} />
              <Route path="/trips/:tripId" element={<TripPage />} />
            </Routes>
          </TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box.textContent ?? "";
}

const spot: Spot = { id: "own", name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" };
const outing = (id: string, date: string, counts: Partial<Trip> = {}): Trip => ({ id, date, spotId: "own", title: "", note: "", ...counts });
const fish = (id: string, at: Date, tripId: string): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 9 }, lure: "Jig", spotId: "own", tripId, caughtAt: at.toISOString(), note: "", weather: null });
// A blank day with two lost and a strike missed, then a day with a fish and a strike missed.
const book: Logbook = {
  spots: [spot],
  trips: [outing("blank", "2026-10-14", { lost: 2, missed: 1 }), outing("good", "2026-10-18", { missed: 1 })],
  catches: [fish("perch", new Date(2026, 9, 18, 9), "good")],
};

describe("round 124 ideas: what got away beside how an outing on the water went", () => {
  it("is said in the outing page's last time here", async () => {
    expect(await page(book, "/trips/good")).toContain("Last time here, Wed, Oct 14: 0 fish · 2 lost · 1 missed");
  });

  it("is said in its next time here, looking back", async () => {
    expect(await page(book, "/trips/blank")).toContain("Next time here, Sun, Oct 18: 1 fish · 1 missed");
  });

  it("is said in the outing form's Last here", async () => {
    expect(await page(book, "/trips/new?spot=own")).toContain("Last here: Sun, Oct 18 · 1 fish · 1 missed");
  });

  it("is counted among an outing search's matches", async () => {
    expect(await page(book, "/trips?find=lost")).toContain("Outings: 1 · 0 fish · 2 lost · 1 missed");
    expect(await page(book, "/trips?find=Own")).toContain("Outings: 2 · 1 fish · 2 lost · 2 missed");
  });

  it("leaves a plan's out of the search's outing count, as it leaves the plan", async () => {
    const planned: Logbook = { ...book, trips: [...book.trips, outing("ahead", "2026-10-25", { lost: 3 })] };
    expect(await page(planned, "/trips?find=Own")).toContain("Outings: 2 · 1 fish · 2 lost · 2 missed · 1 planned");
  });

  it("is said for the other outing of the same day", async () => {
    const dawnDusk: Logbook = { ...book, trips: [...book.trips, outing("dusk", "2026-10-18", { title: "Dusk", lost: 1 })] };
    expect(await page(dawnDusk, "/trips/good")).toContain("Also here that day: Dusk, 0 fish · 1 lost");
  });

  it("leaves the counts as they were when nothing got away", async () => {
    const clean: Logbook = { ...book, trips: book.trips.map(({ lost: _lost, missed: _missed, ...trip }) => trip) };
    expect(await page(clean, "/trips/good")).toMatch(/Last time here, Wed, Oct 14: 0 fish · 4 days before(?! ·)/);
    expect(await page(clean, "/trips?find=Own")).toMatch(/Outings: 2 · 1 fish(?! ·)/);
  });
});

describe("round 124 ideas: news card field81", () => {
  it("lists the line for the field log, with its Polish", () => {
    const line = NEWS_ITEMS.find((item) => item.includes("the strikes missed to how the last outing"));
    expect(line).toBeDefined();
    expect(FIELD_NEWS.has(line!)).toBe(true);
    expect(PL_GAME[line!]).toBeTruthy();
  });
});
