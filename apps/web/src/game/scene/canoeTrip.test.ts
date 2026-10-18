import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_SEASONS, OPEN_WATER, inLake } from "@stillwater/shared";
import { CANOE_LAP_SEC, STROKE_SEC, canoeAt, canoeOut, canoeRoute } from "./canoeTrip";
import { SWAN_LOOP } from "./swanGlide";

describe("a canoe along the far shore", () => {
  it("is out only by day, on dry, clear-sighted days and never on winter ice", () => {
    for (const season of LAKE_SEASONS) {
      expect(canoeOut("day", "clear", season)).toBe(season !== "winter");
    }
    expect(canoeOut("day", "overcast", "summer")).toBe(true);
    expect(canoeOut("day", "rain", "summer")).toBe(false);
    expect(canoeOut("day", "fog", "summer")).toBe(false);
    expect(canoeOut("dawn", "clear", "summer")).toBe(false);
    expect(canoeOut("night", "clear", "summer")).toBe(false);
  });

  it("keeps to open water on the far side, clear of the boat's fishing water and the swans", () => {
    for (let u = 0; u <= 1; u += 0.02) {
      const at = canoeRoute(u);
      expect(inLake(at.x, at.z)).toBe(true);
      expect(at.z).toBeLessThan(LAKE_CENTER_Z - 6);
      expect(Math.hypot(at.x - OPEN_WATER.x, at.z - OPEN_WATER.z)).toBeGreaterThan(OPEN_WATER.r + 2);
      const swan = Math.hypot((at.x - SWAN_LOOP.x) / SWAN_LOOP.rx, (at.z - SWAN_LOOP.z) / SWAN_LOOP.rz);
      expect(swan).toBeGreaterThan(1);
    }
  });

  it("goes one way along the shore, turns round at the end and comes back facing the way it goes", () => {
    const west = canoeAt(0);
    const east = canoeAt(CANOE_LAP_SEC / 2);
    expect(east.x - west.x).toBeGreaterThan(20);
    const heading = (time: number) => {
      const a = canoeAt(time - 0.5);
      const b = canoeAt(time + 0.5);
      const pose = canoeAt(time);
      return { travel: Math.atan2(b.x - a.x, b.z - a.z), yaw: pose.yaw };
    };
    for (const time of [CANOE_LAP_SEC * 0.25, CANOE_LAP_SEC * 0.75]) {
      const { travel, yaw } = heading(time);
      expect(Math.cos(travel - yaw)).toBeGreaterThan(0.99);
    }
    expect(canoeAt(CANOE_LAP_SEC * 0.25).x).toBeLessThan(canoeAt(CANOE_LAP_SEC * 0.25 + 5).x);
    expect(canoeAt(CANOE_LAP_SEC * 0.75).x).toBeGreaterThan(canoeAt(CANOE_LAP_SEC * 0.75 + 5).x);
  });

  it("strokes steadily and switches sides every few strokes", () => {
    const sides = new Set(Array.from({ length: 40 }, (_, i) => canoeAt(i * STROKE_SEC).side));
    expect(sides).toEqual(new Set([1, -1]));
    expect(canoeAt(0).stroke).toBeCloseTo(-1);
    expect(canoeAt(STROKE_SEC / 2).stroke).toBeCloseTo(1);
  });
});
