// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { CatchEntry, Logbook, Spot, Trip } from "@stillwater/shared";
import { TripPage } from "./TripPages";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { markFieldNewsSeen } from "./fieldNews";
import { longestWait } from "./tripPace";
import { setLang } from "../i18n";

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
  setLang("en");
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
const water = (id: string, name: string) => ({ id, name, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const trip = (id: string, date: string, title: string): Trip => ({ id, date, spotId: "own", title, note: "" });
const fish = (id: string, tripId: string, caughtAt: string): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure: "Jig", spotId: "own", tripId, caughtAt, note: "", weather: null }) as CatchEntry;

// Four fish with a two-hour lull before the last; three evenly spaced; and a plan after them.
const book: Logbook = {
  spots: [water("own", "Own Lake")],
  trips: [trip("early", "2026-10-05", "Early"), trip("lulled", "2026-10-15", "Lulled"), trip("even", "2026-10-18", "Even"), trip("plan", "2026-10-25", "Plan")],
  catches: [
    fish("e1", "early", at(5, 7)),
    fish("l1", "lulled", at(15, 6)),
    fish("l2", "lulled", at(15, 6, 20)),
    fish("l3", "lulled", at(15, 6, 35)),
    fish("l4", "lulled", at(15, 8, 35)),
    fish("v1", "even", at(18, 6)),
    fish("v2", "even", at(18, 6, 40)),
    fish("v3", "even", at(18, 7, 20)),
  ],
};

async function outing(id: string): Promise<HTMLElement> {
  stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(book));
  const box = document.createElement("div");
  document.body.append(box);
  await act(async () => {
    createRoot(box).render(
      <MemoryRouter initialEntries={[`/trips/${id}`]}>
        <LogbookProvider>
          <TackleProvider>
            <Routes>
              <Route path="/trips/:tripId" element={<TripPage />} />
            </Routes>
          </TackleProvider>
        </LogbookProvider>
      </MemoryRouter>,
    );
  });
  return box;
}

describe("round 128 ideas: an outing's longest wait between fish", () => {
  it("finds the lull and the fish before it, newest first or not", () => {
    const times = book.catches.filter((entry) => entry.tripId === "lulled").map((entry) => entry.caughtAt);
    expect(longestWait([...times].reverse())).toEqual({ minutes: 120, from: at(15, 6, 35) });
  });

  it("says nothing when the fish came evenly, too few, or a lull is short", () => {
    expect(longestWait([at(18, 6), at(18, 6, 40), at(18, 7, 20)])).toBeNull();
    expect(longestWait([at(15, 6), at(15, 9)])).toBeNull();
    // Half again the usual wait, but under half an hour.
    expect(longestWait([at(15, 6), at(15, 6, 2), at(15, 6, 4), at(15, 6, 25)])).toBeNull();
  });

  it("leaves out fish more than 12 hours apart: not one session", () => {
    expect(longestWait([at(15, 6), at(15, 6, 20), at(15, 19)])).toBeNull();
  });

  it("shows the line on the outing's page beside the busiest hour", async () => {
    expect((await outing("lulled")).querySelector(".longest-wait")?.textContent).toBe("Longest wait between fish: 2 h, from 6:35 AM");
    document.body.innerHTML = "";
    expect((await outing("even")).querySelector(".longest-wait")).toBeNull();
  });

  it("says it in Polish", async () => {
    setLang("pl");
    expect((await outing("lulled")).querySelector(".longest-wait")?.textContent).toMatch(/^Najdłuższa przerwa między rybami: 2 godz\., od /);
  });
});

describe("round 128 ideas: a past outing says how long the water rested before it", () => {
  it("adds the days since the last outing there", async () => {
    expect((await outing("lulled")).querySelector(".last-here")?.textContent).toBe("Last time here, Mon, Oct 5: 1 fish · 10 days before");
  });

  it("counts from the outing's own day, and keeps days ago for a plan", async () => {
    expect((await outing("even")).querySelector(".last-here")?.textContent).toBe("Last time here, Thu, Oct 15: 4 fish · 3 days before");
    document.body.innerHTML = "";
    expect((await outing("plan")).querySelector(".last-here")?.textContent).toBe("Last time here, Sun, Oct 18: 3 fish · 4 days ago");
  });

  it("says it in Polish", async () => {
    setLang("pl");
    expect((await outing("lulled")).querySelector(".last-here")?.textContent).toMatch(/ · 10 dni wcześniej$/);
  });
});
