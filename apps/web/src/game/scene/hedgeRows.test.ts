import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { BUSH, HEDGE_EAST, HEDGE_ROWS, HEDGE_WEST, NIGHT_DIM, facetFront, hedgeBushes, hedgeColor, rowY } from "./hedgeRows";
import { RUN_TOP } from "./sledRun";
import { ROWS as ORCHARD_ROWS } from "./orchardRows";
import { hedgeShape, paintHedges } from "./HillHedges";

describe("hill hedgerows", () => {
  const bushes = hedgeBushes();

  it("finds the drawn, faceted hills a little inside their smooth shape", () => {
    for (const [x, y] of [[-5, 8], [-12, 6], [6, 9.5], [10, 5.8]] as const) {
      const smooth = hillFront(x, y)!;
      const drawn = facetFront(x, y)!;
      expect(drawn).toBeLessThanOrEqual(smooth + 1e-6);
      expect(smooth - drawn).toBeLessThan(0.3);
    }
    expect(facetFront(-60, 6)).toBeNull();
  });

  it("sit on the drawn hills' face, touching it, between their ends", () => {
    expect(bushes.length).toBeGreaterThan(300);
    for (const bush of bushes) {
      expect(bush.x).toBeGreaterThanOrEqual(HEDGE_WEST - 0.1);
      expect(bush.x).toBeLessThanOrEqual(HEDGE_EAST + 0.1);
      const face = facetFront(bush.x, bush.y)!;
      expect(bush.z - face).toBeGreaterThan(0);
      // The bush's depth reaches back past the face, so it never floats in front of the slope.
      expect(bush.z - face).toBeLessThan(BUSH * bush.size);
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

  it("draws every bush from one shared shape and repaints it for the season without rebuilding", () => {
    const shape = hedgeShape(bushes);
    const per = shape.getAttribute("position").count / bushes.length;
    expect(Number.isInteger(per)).toBe(true);
    const color = shape.getAttribute("color");
    paintHedges(shape, bushes, "summer", "day");
    const summer = color.getX(0);
    paintHedges(shape, bushes, "fall", "day");
    expect(color.getX(0)).not.toBe(summer);
    paintHedges(shape, bushes, "fall", "night");
    expect(color.getX(per * 3)).toBeLessThan(1);
    shape.dispose();
  });
});
