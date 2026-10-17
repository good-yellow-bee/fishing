import { beforeEach, describe, expect, it, vi } from "vitest";
import { YEAR_GOAL_KEY, cleanYearGoals, goalPace, readYearGoal } from "./YearGoal";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe("year goal", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
  });

  it("reads a whole goal for its year only", () => {
    localStorage.setItem(YEAR_GOAL_KEY, JSON.stringify({ "2026": 50, "2025": 2.5 }));
    expect(readYearGoal("2026")).toBe(50);
    expect(readYearGoal("2025")).toBeNull();
    expect(readYearGoal("2024")).toBeNull();
  });

  it("reads a broken store as no goal", () => {
    localStorage.setItem(YEAR_GOAL_KEY, "[");
    expect(readYearGoal("2026")).toBeNull();
  });

  it("keeps only whole goals for four-digit years from a file", () => {
    expect(cleanYearGoals({ "2026": 40, "26": 5, "2025": -1, "2024": "9" })).toEqual({ "2026": 40 });
    expect(cleanYearGoals([1, 2])).toEqual({});
  });
});

describe("pace toward the goal", () => {
  it("projects the year and spreads what is left over the weeks left", () => {
    // 17 October 2026: day 290 of 365, 76 days (about 11 weeks) left.
    expect(goalPace(141, 250, new Date(2026, 9, 17, 12))).toEqual({ pace: 177, left: 109, perWeek: 11 });
  });

  it("says nothing before a first fish, once the goal is reached, or in the year's first fortnight", () => {
    expect(goalPace(0, 50, new Date(2026, 5, 1))).toBeNull();
    expect(goalPace(60, 50, new Date(2026, 5, 1))).toBeNull();
    expect(goalPace(3, 50, new Date(2026, 0, 5))).toBeNull();
  });
});
