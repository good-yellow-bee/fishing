import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Logbook, Trip } from "@stillwater/shared";
import { NEWS_ID, NEWS_KEY } from "../game/whatsNew";
import { fieldNewsDue, markFieldNewsSeen, newestFieldNews } from "./fieldNews";
import { nextRealTrips, upcomingRealTrips } from "./bookCopy";

const stored = new Map<string, string>();
beforeEach(() => {
  stored.clear();
  vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => void stored.set(key, value) });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("round 114: Home's What's new", () => {
  it("comes back for a new field line, not for another batch", () => {
    expect(fieldNewsDue(3)).toBe(true);
    markFieldNewsSeen();
    expect(fieldNewsDue(3)).toBe(false);
    localStorage.setItem(NEWS_KEY, "2099-01-01-game99");
    expect(fieldNewsDue(3)).toBe(false);
    localStorage.setItem("stillwater.news.field.v1", "an older line");
    expect(fieldNewsDue(3)).toBe(true);
    expect(newestFieldNews()).toBeTruthy();
  });

  it("counts a batch dismissed before the field mark existed", () => {
    localStorage.setItem(NEWS_KEY, NEWS_ID);
    expect(fieldNewsDue(3)).toBe(false);
  });
});

describe("round 114: two outings today", () => {
  it("put the one being fished first", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 7, 0));
    const trip = (id: string, spotId: string): Trip => ({ id, date: "2026-10-20", spotId, title: "", note: "" });
    const book: Logbook = {
      spots: [],
      trips: [trip("evening", "x"), trip("dawn", "y")],
      catches: [{ id: "f", species: "Perch", measure: { kind: "length", inches: 9 }, lure: "Jig", spotId: "y", tripId: "dawn", caughtAt: new Date(2026, 9, 20, 6, 0).toISOString(), note: "", weather: null }],
    };
    expect(upcomingRealTrips(book, "2026-10-20").map((each) => each.id)).toEqual(["dawn", "evening"]);
    expect(nextRealTrips(book, "2026-10-20").map((each) => each.id)).toEqual(["evening"]);
  });
});
