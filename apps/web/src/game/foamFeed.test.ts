import { describe, expect, it } from "vitest";
import { FOAM_REACH, onFoamLane } from "./foamFeed";
import { foamLanes } from "./scene/foamLanesPlan";

const STRONG = { x: 0, z: 0.13 };

describe("onFoamLane", () => {
  it("sits a lure in a foam lane only where the wind has combed one", () => {
    const point = foamLanes(STRONG)[0]!.points[0]!;
    expect(onFoamLane(STRONG, point.x, point.z)).toBe(true);
    expect(onFoamLane(STRONG, point.x + FOAM_REACH * 0.5, point.z)).toBe(true);
    expect(onFoamLane(STRONG, 400, 400)).toBe(false);
  });

  it("finds no foam lanes in a calm or without a wind", () => {
    expect(onFoamLane({ x: 0, z: 0 }, 0, 0)).toBe(false);
    expect(onFoamLane(undefined, 0, 0)).toBe(false);
  });

  it("lays some foam lanes within a cast of the boat's open pad", () => {
    const points = foamLanes(STRONG).flatMap((dash) => dash.points);
    expect(points.some((point) => Math.hypot(point.x - 4, point.z + 6.2) <= 11)).toBe(true);
  });
});
