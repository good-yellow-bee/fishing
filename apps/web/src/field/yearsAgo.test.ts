import { describe, expect, it } from "vitest";
import { sampleLogbook } from "@stillwater/shared";
import { thisWeekInPastYears } from "./yearsAgo";

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

  it("reaches across a month's end and keeps to the limit", () => {
    const found = thisWeekInPastYears(
      [at("a", "2025-10-31T08:00:00"), at("b", "2025-11-01T08:00:00"), at("c", "2025-10-30T08:00:00")],
      new Date(2026, 9, 31, 12),
      3,
      2,
    );
    expect(found.map((entry) => entry.id)).toEqual(["b", "a"]);
  });
});
