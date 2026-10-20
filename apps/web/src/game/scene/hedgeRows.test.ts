import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { BUSH, HEDGE_EAST, HEDGE_ROWS, HEDGE_WEST, NIGHT_DIM, hedgeBushes, hedgeColor, rowY } from "./hedgeRows";
import { RUN_TOP } from "./sledRun";
import { ROWS as ORCHARD_ROWS } from "./orchardRows";

describe("hill hedgerows", () => {
  const bushes = hedgeBushes();

  it("sit on the hills' face, between their ends", () => {
    expect(bushes.length).toBeGreaterThan(300);
    for (const bush of bushes) {
      expect(bush.x).toBeGreaterThanOrEqual(HEDGE_WEST - 0.1);
      expect(bush.x).toBeLessThanOrEqual(HEDGE_EAST + 0.1);
      const face = hillFront(bush.x, bush.y)!;
      expect(bush.z - face).toBeGreaterThan(0);
      expect(bush.z - face).toBeLessThan(BUSH * 2);
    }
  });

  it("keep above the farm, the orchard and the top of the sled run", () => {
    const lowest = Math.min(...bushes.map((bush) => bush.y));
    expect(lowest).toBeGreaterThan(RUN_TOP.y + 0.5);
    expect(lowest).toBeGreaterThan(Math.max(...ORCHARD_ROWS) + 2);
  });

  it("leave gaps for gates along each row", () => {
    HEDGE_ROWS.forEach((_, row) => {
      const xs = bushes
        .filter((bush) => Math.abs(bush.y - rowY(row, bush.x)) < 0.01)
        .map((bush) => bush.x)
        .sort((a, b) => a - b);
      const gaps = xs.slice(1).filter((x, i) => x - xs[i]! > 0.8);
      expect(gaps.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("change with the seasons and darken at night", () => {
    const seasons = (["spring", "summer", "fall", "winter"] as const).map((season) => hedgeColor(season, "day", 0).hex);
    expect(new Set(seasons).size).toBe(4);
    expect(hedgeColor("summer", "night", 0).dim).toBe(NIGHT_DIM);
    expect(hedgeColor("summer", "day", 0).dim).toBe(1);
  });
});
