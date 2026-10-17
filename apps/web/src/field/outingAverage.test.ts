import { describe, expect, it } from "vitest";
import { bestOutingHere, outingAverage, outingStreak, topOuting } from "./outingAverage";

const trip = (id: string, date: string) => ({ id, date, spotId: "spot-cedar", title: id, note: "" });

describe("outing average", () => {
  it("averages the outings already fished and counts the blank ones", () => {
    const fish: Record<string, number> = { a: 3, b: 0, c: 2, later: 9 };
    const text = outingAverage([trip("a", "2026-10-01"), trip("b", "2026-10-05"), trip("c", "2026-10-09"), trip("later", "2026-11-01")], (id) => fish[id] ?? 0, "2026-10-15");
    expect(text).toBe("1.7 fish an outing on average, 1 without a fish");
  });

  it("shows a small average to the hundredth, not as 0", () => {
    const trips = Array.from({ length: 30 }, (_, n) => trip(`t${n}`, `2026-09-${String(n + 1).padStart(2, "0")}`));
    expect(outingAverage(trips, (id) => (id === "t0" ? 1 : 0), "2026-10-15")).toMatch(/^0\.03 fish an outing on average/);
  });

  it("says nothing with fewer than two outings fished", () => {
    expect(outingAverage([trip("a", "2026-10-01"), trip("later", "2026-11-01")], () => 2, "2026-10-15")).toBeNull();
  });

  it("leaves out today's outing until it has a fish", () => {
    const trips = [trip("a", "2026-10-01"), trip("b", "2026-10-05"), trip("today", "2026-10-15")];
    expect(outingAverage(trips, (id) => (id === "today" ? 0 : 2), "2026-10-15")).toBe("2 fish an outing on average");
  });
});

describe("best outing here", () => {
  const trips = [trip("a", "2026-10-01"), trip("b", "2026-10-05"), trip("c", "2026-10-09"), trip("later", "2026-11-01")];
  const fish: Record<string, number> = { a: 3, b: 5, c: 5, later: 9 };

  it("names an outing that beats every other one fished here", () => {
    expect(bestOutingHere(trips, (id) => (id === "c" ? 6 : (fish[id] ?? 0)), "c", "2026-10-15")).toBe("The most fish of any outing on this water");
  });

  it("says nothing on a tie, a planned outing, or with fewer than three fished", () => {
    expect(bestOutingHere(trips, (id) => fish[id] ?? 0, "c", "2026-10-15")).toBeNull();
    expect(bestOutingHere(trips, (id) => fish[id] ?? 0, "later", "2026-10-15")).toBeNull();
    expect(bestOutingHere(trips.slice(1), (id) => (id === "c" ? 6 : (fish[id] ?? 0)), "c", "2026-10-15")).toBeNull();
  });
});

describe("outing streak", () => {
  const trips = [trip("a", "2026-10-01"), trip("b", "2026-10-05"), trip("c", "2026-10-09"), trip("d", "2026-10-12"), trip("later", "2026-11-01")];

  it("finds the longest run of outings with a fish, in date order", () => {
    const fish: Record<string, number> = { a: 1, b: 2, c: 0, d: 4, later: 0 };
    expect(outingStreak([...trips].reverse(), (id) => fish[id] ?? 0, "2026-10-15")).toEqual({ best: 2, going: false, dry: 1, dryNow: 0 });
  });

  it("says when the latest outings are still on the run, and leaves planned ones out", () => {
    const fish: Record<string, number> = { a: 0, b: 2, c: 1, d: 4 };
    expect(outingStreak(trips, (id) => fish[id] ?? 0, "2026-10-15")).toEqual({ best: 3, going: true, dry: 1, dryNow: 0 });
    expect(outingStreak(trips, () => 0, "2026-10-15")).toEqual({ best: 0, going: false, dry: 4, dryNow: 4 });
  });

  it("counts two outings on one day as one step, whichever order they were saved in", () => {
    const fish: Record<string, number> = { a: 1, b: 2, morning: 0, evening: 3 };
    const sameDay = [trip("a", "2026-10-01"), trip("b", "2026-10-05"), trip("morning", "2026-10-09"), trip("evening", "2026-10-09")];
    expect(outingStreak(sameDay, (id) => fish[id] ?? 0, "2026-10-15")).toEqual({ best: 3, going: true, dry: 0, dryNow: 0 });
    expect(outingStreak([...sameDay].reverse(), (id) => fish[id] ?? 0, "2026-10-15")).toEqual({ best: 3, going: true, dry: 0, dryNow: 0 });
  });
});

describe("top outing", () => {
  it("picks the one outing with the most fish, and none on a tie", () => {
    const trips = [trip("a", "2026-10-01"), trip("b", "2026-10-05"), trip("c", "2026-10-09"), trip("later", "2026-11-01")];
    expect(topOuting(trips, (id) => ({ a: 1, b: 4, c: 2, later: 9 })[id] ?? 0, "2026-10-15")?.id).toBe("b");
    expect(topOuting(trips, (id) => ({ a: 4, b: 4, c: 2 })[id] ?? 0, "2026-10-15")).toBeNull();
  });
});
