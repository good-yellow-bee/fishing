// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { TripsPage, planText } from "./TripPages";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";
import { tripSummary } from "./summaries";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 12));
  markFieldNewsSeen();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const water = (id: string, name: string) => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const trip = (id: string, date: string, spotId: string, title = ""): Trip => ({ id, date, spotId, title, note: "" });
const fish = (id: string, spotId: string, tripId: string, day: number): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure: "Jig", spotId, tripId, caughtAt: new Date(2026, 9, day, 7).toISOString(), note: "", weather: null }) as CatchEntry;

// A water imported with no name, beside one with a name.
const book: Logbook = {
  spots: [water("blank", "  "), water("own", "Own Lake")],
  trips: [trip("past", "2026-10-17", "blank"), trip("plan", "2026-10-28", "blank"), trip("own", "2026-10-12", "own")],
  catches: [fish("1", "own", "own", 12), fish("2", "blank", "own", 12)],
};

describe("round 128: an outing on a water with no name", () => {
  it("names the water on its Trips card, not a bare separator", async () => {
    stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
    const box = document.createElement("div");
    document.body.append(box);
    await act(async () => {
      createRoot(box).render(
        <MemoryRouter initialEntries={["/trips"]}>
          <LogbookProvider>
            <TackleProvider>
              <TripsPage />
            </TackleProvider>
          </LogbookProvider>
        </MemoryRouter>,
      );
    });
    const metas = [...box.querySelectorAll('a.trip-card[href="/trips/past"] .meta, a.trip-card[href="/trips/plan"] .meta')].map((meta) => meta.textContent);
    expect(metas).toHaveLength(2);
    for (const meta of metas) expect(meta).toMatch(/^Water with no name · Lake · /);
    // A named water's untitled outing still leaves its name to the heading.
    expect(box.querySelector('a.trip-card[href="/trips/own"] .meta')?.textContent).toMatch(/^Lake · /);
  });

  it("names the water in the copied plan and summary", () => {
    expect(planText(book, book.trips[1]!, []).split("\n")[0]).toBe("Wed, Oct 28 · Water with no name");
    expect(tripSummary(book.trips[0]!, "  ", []).split("\n")[0]).toMatch(/ · Water with no name$/);
  });
});
