import { describe, expect, it } from "vitest";
import type { CatchEntry } from "@stillwater/shared";
import { typicalByYear } from "./sizeBands";

const fish = (year: number, inches: number, i: number) => ({ id: `${year}-${i}`, caughtAt: new Date(year, 5, 1 + i).toISOString(), measure: { kind: "length", inches } }) as unknown as CatchEntry;

describe("typicalByYear", () => {
  it("gives each year's middle size, oldest first, for years with enough fish", () => {
    const catches = [...[10, 12, 14, 16].map((n, i) => fish(2025, n, i)), ...[14, 15, 16, 20, 22].map((n, i) => fish(2026, n, i)), fish(2024, 30, 0)];
    expect(typicalByYear(catches, "length")).toEqual([
      { year: "2025", size: { kind: "length", inches: 13 } },
      { year: "2026", size: { kind: "length", inches: 16 } },
    ]);
  });
});
