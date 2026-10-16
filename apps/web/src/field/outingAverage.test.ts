import { describe, expect, it } from "vitest";
import { outingAverage } from "./outingAverage";

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
});
