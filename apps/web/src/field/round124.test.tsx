// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { sampleLogbook, type CatchEntry, type Logbook, type Spot } from "@stillwater/shared";
import { TripFormPage, TripPage } from "./TripPages";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";

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

const spot = (id: string, name: string): Spot => ({ id, name, waterType: "lake", notes: "", bestConditions: "" });

describe("round 124: an outing and its form beside the sample week with only a water of the angler's own", () => {
  // Made a week ago: its plans on Cedar Bend (Oct 14) and Quarry Cut (Oct 17) have passed blank, and Trips hides them.
  const sample = sampleLogbook(new Date(2026, 9, 14, 12));
  const book: Logbook = { ...sample, spots: [...sample.spots, spot("own", "Own Lake")] };

  it("names no blank plan as the water's next outing", async () => {
    const text = await page(book, "/trips/trip-quarry");
    expect(text).toContain("Fish came between 2:10 PM and 3:05 PM");
    expect(text).not.toContain("Next time here");
  });

  it("takes the form's last outing and notes from the days fished, not the plan", async () => {
    const text = await page(book, "/trips/new?spot=spot-quarry");
    expect(text).toContain("Last here: Rock points, Thu, Oct 8 · 2 fish");
    expect(text).not.toContain("Back to the points");
    expect(text).not.toContain("Green pumpkin tubes and a spare leader.");
  });

  it("says no outing is already there on the plan's day", async () => {
    const text = await page(book, "/trips/new?spot=spot-cedar&date=2026-10-14");
    expect(text).toContain("Last here: Evening edge, Sun, Oct 11 · 2 fish");
    expect(text).not.toContain("You already have an outing");
  });
});

describe("round 124: the quiet since the last fish counts a fish logged loose on the outing's water", () => {
  const fish = (id: string, at: Date, tripId: string | null): CatchEntry => ({ id, species: "Perch", measure: { kind: "length", inches: 9 }, lure: "Jig", spotId: "own", tripId, caughtAt: at.toISOString(), note: "", weather: null });
  const outing = (id: string) => ({ id, date: "2026-10-21", spotId: "own", title: id, note: "" });
  const book = (catches: CatchEntry[], trips = [outing("today")]): Logbook => ({ spots: [spot("own", "Own Lake")], trips, catches });

  it("goes from the loose fish after the outing's own", async () => {
    const text = await page(book([fish("mine", new Date(2026, 9, 21, 7), "today"), fish("loose", new Date(2026, 9, 21, 11), null)]), "/trips/today");
    expect(text).toContain("Last fish 60 min ago");
  });

  it("is there with only a loose fish", async () => {
    const text = await page(book([fish("loose", new Date(2026, 9, 21, 11, 30), null)]), "/trips/today");
    expect(text).toContain("Last fish 30 min ago");
  });

  it("leaves a dawn's loose fish to the dawn, not the day's dusk", async () => {
    const both = book([fish("loose", new Date(2026, 9, 21, 6), null)], [outing("dawn"), outing("dusk")]);
    expect(await page(both, "/trips/dawn")).toContain("Last fish 6 h ago");
    document.body.innerHTML = "";
    expect(await page(both, "/trips/dusk")).not.toContain("Last fish");
  });
});
