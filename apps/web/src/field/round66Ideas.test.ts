import { describe, expect, it } from "vitest";
import { goalPace } from "./YearGoal";

describe("round 66 ideas: the year goal's pace", () => {
  it("says how far ahead of or behind an even pace to the goal the year is", () => {
    // 1 July 2026 is day 182 of 365: an even pace to 100 is 50 fish by then.
    expect(goalPace(60, 100, new Date(2026, 6, 1, 12))?.ahead).toBe(10);
    expect(goalPace(42, 100, new Date(2026, 6, 1, 12))?.ahead).toBe(-8);
    expect(goalPace(50, 100, new Date(2026, 6, 1, 12))?.ahead).toBe(0);
  });
});
