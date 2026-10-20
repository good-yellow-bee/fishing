import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Logbook, Spot, Trip } from "@stillwater/shared";
import { outingMean, outingStreak, topOuting, weekendSplit, weekStreak } from "./outingAverage";

const water = (id: string): Spot => ({ id, name: id, waterType: "lake", notes: "", bestConditions: "" }) as Spot;
const trip = (id: string, date: string, extra: Partial<Trip> = {}): Trip => ({ id, date, spotId: "w", title: "", note: "", ...extra }) as Trip;

describe("round 118 fixes: trips", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T19:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("counts today's outing with only a fish lost as a blank one fished, as Trips counts it", () => {
    const trips = [trip("a", "2026-10-10"), trip("b", "2026-10-12"), trip("c", "2026-10-20", { lost: 1 })];
    const fishOn = (id: string) => (id === "c" ? 0 : 2);
    // The run of fished outings ends with today's blank, which starts a dry spell.
    expect(outingStreak(trips, fishOn, "2026-10-20")).toMatchObject({ best: 2, going: false, dryNow: 1 });
    expect(topOuting([...trips, trip("d", "2026-10-14")], (id) => (id === "d" ? 5 : fishOn(id)), "2026-10-20")?.id).toBe("d");
    expect(outingMean(trips, fishOn, "2026-10-20", "a")).toBe(1);
    // A missed strike today keeps this week's run going.
    expect(weekStreak([trip("e", "2026-10-13"), trip("f", "2026-10-20", { missed: 1 })], "2026-10-20", () => 0)).toEqual({ best: 2, going: true });
  });

  it("sets today's weekend outing with a fish lost against the weekdays", () => {
    vi.setSystemTime(new Date("2026-10-18T19:00:00"));
    // Saturday 10 and Sunday 18 (lost only) against Monday 12 and Tuesday 13.
    const trips = [trip("sat", "2026-10-10"), trip("sun", "2026-10-18", { lost: 1 }), trip("mon", "2026-10-12"), trip("tue", "2026-10-13")];
    expect(weekendSplit(trips, (id) => (id === "sat" ? 4 : id === "sun" ? 0 : 1), "2026-10-18")).toEqual({ weekend: 2, weekday: 1 });
  });

  it("counts last evening's blank that gave way to today's plan, given the book", () => {
    vi.setSystemTime(new Date("2026-10-21T01:00:00"));
    const trips = [trip("a", "2026-10-15"), trip("b", "2026-10-17"), trip("eve", "2026-10-20"), trip("plan", "2026-10-21")];
    const book: Logbook = { spots: [water("w")], trips, catches: [] };
    const fishOn = (id: string) => (id === "a" || id === "b" ? 1 : 0);
    expect(outingStreak(trips, fishOn, "2026-10-20")).toMatchObject({ best: 2, going: true });
    expect(outingStreak(trips, fishOn, "2026-10-20", [], book)).toMatchObject({ best: 2, going: false, dryNow: 1 });
  });
});
