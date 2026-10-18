import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { foamLanes, foamLanesAmount } from "./foamLanesPlan";
import { WHITECAP_MIN_WIND } from "./whitecapLife";
import { waterDepth } from "./water";

const STRONG = { x: 0.1, z: 0.06 };

describe("wind lanes of foam", () => {
  it("only form once the wind breaks whitecaps, and thicken as it gets up", () => {
    expect(foamLanes({ x: 0, z: 0 })).toEqual([]);
    expect(foamLanes({ x: WHITECAP_MIN_WIND * 0.9, z: 0 })).toEqual([]);
    expect(foamLanesAmount(WHITECAP_MIN_WIND)).toBeGreaterThan(0);
    expect(foamLanesAmount(0.2)).toBe(1);
    const foam = (wind: { x: number; z: number }) => foamLanes(wind).reduce((sum, dash) => sum + dash.points.length, 0);
    expect(foam({ x: 0.13, z: 0 })).toBeGreaterThan(foam({ x: 0.075, z: 0 }));
  });

  it("lie down the wind, on open water only", () => {
    const dashes = foamLanes(STRONG);
    expect(dashes.length).toBeGreaterThan(10);
    const speed = Math.hypot(STRONG.x, STRONG.z);
    for (const dash of dashes) {
      for (const p of dash.points) {
        expect(inLake(p.x, p.z)).toBe(true);
        expect(waterDepth(p.x, p.z)).toBeGreaterThanOrEqual(0.25);
      }
      const first = dash.points[0]!;
      const last = dash.points[dash.points.length - 1]!;
      const run = Math.hypot(last.x - first.x, last.z - first.z);
      const along = ((last.x - first.x) * STRONG.x + (last.z - first.z) * STRONG.z) / speed;
      expect(along / run).toBeGreaterThan(0.95);
    }
  });

  it("are the same every time for the same wind", () => {
    expect(foamLanes(STRONG)).toEqual(foamLanes({ ...STRONG }));
  });
});
