import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { thisWeekInPastYears, yearsBack } from "./yearsAgo";

describe("this week in past years", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const at = (id: string, iso: string) => ({ ...base, id, caughtAt: iso });
  const now = new Date(2026, 9, 15, 12);

  it("finds fish from earlier years within a few days of today's date, newest first", () => {
    const found = thisWeekInPastYears(
      [at("a", "2025-10-13T08:00:00"), at("b", "2024-10-17T08:00:00"), at("c", "2025-10-25T08:00:00"), at("d", "2026-10-14T08:00:00")],
      now,
    );
    expect(found.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("keeps a fish in the week all day, by calendar day rather than by the hour", () => {
    const fish = [at("a", "2025-10-13T08:00:00")];
    expect(thisWeekInPastYears(fish, new Date(2026, 9, 16, 7))).toHaveLength(1);
    expect(thisWeekInPastYears(fish, new Date(2026, 9, 16, 20))).toHaveLength(1);
    expect(thisWeekInPastYears(fish, new Date(2026, 9, 17, 0, 5))).toHaveLength(0);
  });

  it("reaches across a month's end and keeps to the limit", () => {
    const found = thisWeekInPastYears(
      [at("a", "2025-10-31T08:00:00"), at("b", "2025-11-01T08:00:00"), at("c", "2025-10-30T08:00:00")],
      new Date(2026, 9, 31, 12),
      3,
      2,
    );
    expect(found.map((entry) => entry.id)).toEqual(["b", "a"]);
  });

  it("reaches across New Year and counts the years from the nearer date", () => {
    const newYear = new Date(2027, 0, 1, 12);
    const found = thisWeekInPastYears([at("a", "2025-12-30T08:00:00"), at("b", "2026-12-30T08:00:00"), at("c", "2025-12-20T08:00:00")], newYear);
    expect(found.map((entry) => entry.id)).toEqual(["a"]);
    expect(yearsBack(found[0]!, newYear)).toBe(1);
    const yearEnd = new Date(2026, 11, 30, 12);
    const early = at("d", "2026-01-01T08:00:00");
    expect(thisWeekInPastYears([early], yearEnd).map((entry) => entry.id)).toEqual(["d"]);
    expect(yearsBack(early, yearEnd)).toBe(1);
  });
});
