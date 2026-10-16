import { describe, expect, it } from "vitest";
import { bestOutingHere, outingAverage } from "./outingAverage";

const trip = (id: string, date: string) => ({ id, date, spotId: "spot-cedar", title: id, note: "" });

describe("outing average", () => {
  it("averages the outings already fished and counts the blank ones", () => {
    const fish: Record<string, number> = { a: 3, b: 0, c: 2, later: 9 };
    const text = outingAverage([trip("a", "2026-10-01"), trip("b", "2026-10-05"), trip("c", "2026-10-09"), trip("later", "2026-11-01")], (id) => fish[id] ?? 0, "2026-10-15");
    expect(text).toBe("1.7 fish an outing on average, 1 without a fish");
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
