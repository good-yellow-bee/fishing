import { describe, expect, it } from "vitest";
import type { CatchEntry, Logbook } from "@stillwater/shared";
import { nextRealTrips } from "./bookCopy";
import { outingName } from "./format";
import { lateOutings, outNow } from "./tripDates";

const fish = (id: string, tripId: string | null, at: Date, spotId = "own"): CatchEntry => ({ id, species: "Pike", measure: { kind: "length", inches: 30 }, lure: "Jig", spotId, tripId, caughtAt: at.toISOString(), note: "", weather: null });
const outing = (id: string, date: string, spotId = "own") => ({ id, date, spotId, title: "", note: "" });

describe("round 109: out now", () => {
  it("leaves last evening's outing once today's is under way, as Home and Trips list it", () => {
    const book: Logbook = { spots: [], trips: [outing("eve", "2026-10-19"), outing("dawn", "2026-10-20", "far")], catches: [fish("e", "eve", new Date(2026, 9, 19, 23, 30)), fish("d", "dawn", new Date(2026, 9, 20, 0, 30), "far")] };
    const at = new Date(2026, 9, 20, 1, 0);
    expect(outNow(book, book.trips[0]!, at)).toBe(false);
    expect(outNow(book, book.trips[1]!, at)).toBe(true);
    expect(outNow({ ...book, catches: [book.catches[0]!] }, book.trips[0]!, at)).toBe(true);
  });
});

describe("round 109: the next outing", () => {
  it("is not today's once a fish was logged loose on its water", () => {
    const book: Logbook = { spots: [], trips: [outing("morning", "2026-10-20"), outing("later", "2026-10-25")], catches: [fish("l", null, new Date(2026, 9, 20, 9, 0))] };
    expect(nextRealTrips(book, "2026-10-20").map((trip) => trip.id)).toEqual(["later"]);
  });
});

describe("round 109: an untitled outing", () => {
  it("reads its water's name without stray spaces", () => {
    expect(outingName({ title: "", spotId: "own" }, [{ id: "own", name: "  Pine   Pond " }])).toBe("Pine Pond");
  });
});

describe("round 109: last evening's outing in the small hours", () => {
  it("gives way to today's outing under way by a loose fish, a lost fish or a miss", () => {
    const at = new Date(2026, 9, 20, 1, 0);
    const base: Logbook = { spots: [], trips: [outing("eve", "2026-10-19"), outing("dawn", "2026-10-20", "far")], catches: [fish("e", "eve", new Date(2026, 9, 19, 23, 30))] };
    expect(lateOutings(base, at).map((trip) => trip.id)).toEqual(["eve"]);
    expect(lateOutings({ ...base, catches: [...base.catches, fish("l", null, new Date(2026, 9, 20, 0, 30), "far")] }, at)).toEqual([]);
    expect(lateOutings({ ...base, trips: [base.trips[0]!, { ...base.trips[1]!, lost: 1 }] }, at)).toEqual([]);
  });
});
