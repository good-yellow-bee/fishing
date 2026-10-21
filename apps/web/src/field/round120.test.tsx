// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { sampleLogbook, type CatchEntry, type Logbook, type Spot, type Trip } from "@stillwater/shared";
import { upcomingRealTrips } from "./bookCopy";
import { sheetOutings, tripsCsv } from "./catchCsv";
import { daysOut } from "./tripMonths";
import { averagedOutings } from "./TripPages";
import { countedBook } from "./milestones";
import { HomePage } from "./HomePage";
import { LogbookProvider } from "./LogbookState";
import { TackleProvider } from "./gear/TackleState";
import { seasonCopy } from "./bests/SeasonRecap";
import { planText } from "./TripPages";
import { LOGBOOK_STORAGE_KEY } from "./storage";
import { setLang } from "../i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TODAY = "2026-10-21";
const water = (id: string) => ({ id, name: "Own Lake", waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const trip = (id: string, date: string, more: Partial<Trip> = {}): Trip => ({ id, date, spotId: "own", title: "", note: "", ...more }) as Trip;
const fish = (id: string, tripId: string | null, hour: number, day = 21): CatchEntry =>
  ({ id, species: "Roach", measure: { kind: "length", inches: 8 }, lure: "Jig", spotId: "own", tripId, caughtAt: new Date(2026, 9, day, hour).toISOString(), note: "", weather: null }) as CatchEntry;

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value), removeItem: (key: string) => void stored.delete(key) });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 21, 12));
});
afterEach(() => {
  setLang("en");
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

/** The sample week made a week ago, and a water of the angler's own added since: its plans have passed blank. */
function weekOldSampleWithOwnWater(): Logbook {
  const sample = sampleLogbook(new Date(2026, 9, 14, 12));
  return { ...sample, spots: [...sample.spots, water("own")] };
}

describe("round 120: the sample week's blank plans beside a water of the angler's own", () => {
  it("stay out of the outings sheet and the days out, as Trips' average leaves them out", () => {
    const book = weekOldSampleWithOwnWater();
    const sheet = sheetOutings(book, TODAY).trips.map((each) => each.id).sort();
    expect(sheet).toEqual(averagedOutings(book).filter((each) => each.date < TODAY).map((each) => each.id).sort());
    expect(book.trips.some((each) => each.date < TODAY && !sheet.includes(each.id))).toBe(true);
    expect(tripsCsv(book, TODAY).trim().split("\r\n")).toHaveLength(sheet.length + 1);
    expect(daysOut(countedBook(book), "2026", TODAY)).toBe(new Set(sheet.map((id) => book.trips.find((each) => each.id === id)!.date)).size);
  });

  it("still count while the sample week is all the book holds", () => {
    const sample = sampleLogbook(new Date(2026, 9, 14, 12));
    expect(sheetOutings(sample, TODAY).trips.length).toBe(sample.trips.filter((each) => each.date < TODAY).length);
  });
});

describe("round 120: a dawn and a dusk today with a fish loose on their water", () => {
  it("put the one with a lost fish or a miss first, where the catch form files the next fish", () => {
    const book: Logbook = { spots: [water("own")], trips: [trip("dawn", TODAY), trip("dusk", TODAY, { missed: 1 })], catches: [fish("1", null, 10)] };
    expect(upcomingRealTrips(book, TODAY).map((each) => each.id)).toEqual(["dusk", "dawn"]);
  });

  it("keep their order when neither has one", () => {
    const book: Logbook = { spots: [water("own")], trips: [trip("dawn", TODAY), trip("dusk", TODAY)], catches: [fish("1", null, 10)] };
    expect(upcomingRealTrips(book, TODAY).map((each) => each.id)).toEqual(["dawn", "dusk"]);
  });
});

describe("round 120: the exports beside a water of the angler's own with nothing logged on it", () => {
  it("leave the goal out of the copied year, as the goal box does", () => {
    stored.set("stillwater.field-log.year-goal.v1", JSON.stringify({ "2026": 50 }));
    const book = countedBook(weekOldSampleWithOwnWater());
    expect(seasonCopy(book, "2026", TODAY)).not.toContain("50");
    const own: Logbook = { ...book, trips: [...book.trips, trip("mine", "2026-10-01")], catches: [...book.catches, fish("m", "mine", 8, 1)] };
    expect(seasonCopy(countedBook(own), "2026", TODAY)).toContain("50");
  });

  it("name no sample lures as working at a sample water a first own outing goes to", () => {
    const sample = sampleLogbook(new Date(2026, 9, 14, 12));
    const water = sample.trips[0]!.spotId;
    const mine = trip("mine", "2026-10-25", { spotId: water });
    const book: Logbook = { ...sample, trips: [...sample.trips, mine] };
    expect(sample.catches.some((each) => each.spotId === water)).toBe(true);
    expect(planText(book, mine, [])).not.toContain("Works here");
  });
});

describe("round 120: Home's year goal", () => {
  it("is not filled by the sample week's fish beside a water of the angler's own", async () => {
    stored.set(LOGBOOK_STORAGE_KEY, JSON.stringify(weekOldSampleWithOwnWater()));
    stored.set("stillwater.field-log.year-goal.v1", JSON.stringify({ "2026": 120 }));
    const box = document.createElement("div");
    document.body.append(box);
    await act(async () => {
      createRoot(box).render(
        <MemoryRouter>
          <LogbookProvider>
            <TackleProvider>
              <HomePage />
            </TackleProvider>
          </LogbookProvider>
        </MemoryRouter>,
      );
    });
    expect(box.textContent).toContain("this year");
    expect(box.textContent).not.toContain("of 120");
    expect(box.textContent).not.toContain("Set a goal");
  });
});
