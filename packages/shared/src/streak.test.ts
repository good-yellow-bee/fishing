import { describe, expect, it } from "vitest";
import { daysBetween, isLocalDay, streakDays } from "./streak.ts";

describe("days on the water", () => {
  it("reads only real calendar days", () => {
    expect(isLocalDay("2026-10-14")).toBe(true);
    expect(isLocalDay("2026-02-30")).toBe(false);
    expect(isLocalDay("2026-10-14T00:00")).toBe(false);
    expect(isLocalDay(20261014)).toBe(false);
  });

  it("counts whole days across a month end and a clock change", () => {
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });

  it("builds a run from consecutive days, in any order and with repeats", () => {
    const days = ["2026-10-12", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-14"];
    expect(streakDays(days, "2026-10-14")).toEqual({ current: 1, longest: 3 });
    expect(streakDays(days.slice(0, 4), "2026-10-13")).toEqual({ current: 3, longest: 3 });
  });

  it("keeps the run alive through today until a whole day is missed", () => {
    const days = ["2026-10-11", "2026-10-12", "2026-10-13"];
    expect(streakDays(days, "2026-10-14").current).toBe(3);
    expect(streakDays(days, "2026-10-15")).toEqual({ current: 0, longest: 3 });
  });

  it("is empty with no fish, and skips days that aren't days", () => {
    expect(streakDays([], "2026-10-14")).toEqual({ current: 0, longest: 0 });
    expect(streakDays(["nope", "2026-10-14"], "2026-10-14")).toEqual({ current: 1, longest: 1 });
  });
});
