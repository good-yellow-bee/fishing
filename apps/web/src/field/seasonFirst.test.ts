import { describe, expect, it } from "vitest";
import { sampleLogbook, type CatchEntry } from "@stillwater/shared";
import { seasonFirst } from "./seasonFirst";

describe("seasonFirst", () => {
  const base = sampleLogbook(new Date(2026, 9, 15)).catches[0]!;
  const fish = (id: string, at: Date): CatchEntry => ({ ...base, id, caughtAt: at.toISOString() });

  it("says how many days earlier this year's first came", () => {
    const catches = [fish("a", new Date(2025, 3, 12, 9)), fish("b", new Date(2025, 5, 1)), fish("c", new Date(2026, 3, 3, 18)), fish("d", new Date(2026, 6, 1))];
    expect(seasonFirst(catches)).toMatchObject({ year: 2026, earlier: 9 });
    expect(seasonFirst(catches)?.entry.id).toBe("c");
  });

  it("counts a later first as negative, and needs the year before", () => {
    expect(seasonFirst([fish("a", new Date(2025, 3, 1)), fish("b", new Date(2026, 3, 5))])?.earlier).toBe(-4);
    expect(seasonFirst([fish("a", new Date(2024, 3, 1)), fish("b", new Date(2026, 3, 5))])).toBeNull();
    expect(seasonFirst([])).toBeNull();
  });
});
