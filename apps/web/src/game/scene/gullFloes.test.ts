import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { FLIGHT_EVERY_SEC, GULL_COUNT, gullAt, gullFloes, gullsOut } from "./gullFloes";
import { floeSpot } from "./iceFloes";

const WIND = { x: 0.02, z: -0.01 };

describe("winter gulls", () => {
  it("are out at dawn and by day in winter, but not in fog", () => {
    expect(gullsOut("day", "clear", "winter")).toBe(true);
    expect(gullsOut("dawn", "rain", "winter")).toBe(true);
    expect(gullsOut("day", "fog", "winter")).toBe(false);
    expect(gullsOut("day", "clear", "fall")).toBe(false);
    expect(gullsOut("dusk", "clear", "winter")).toBe(false);
  });

  it("each have a broad floe of their own on the far side of the lake", () => {
    const floes = gullFloes();
    expect(floes).toHaveLength(GULL_COUNT);
    expect(new Set(floes).size).toBe(GULL_COUNT);
    for (const floe of floes) {
      expect(floe.z).toBeLessThan(-4);
      expect(floe.radius).toBeGreaterThan(0.35);
    }
  });

  it("stand on their floe facing into the wind, ride it as it drifts, and come back to it", () => {
    const floes = gullFloes();
    floes.forEach((floe, i) => {
      let flights = 0;
      for (let t = 0; t < FLIGHT_EVERY_SEC * 3; t += 1 / 30) {
        const a = gullAt(i, floe, WIND, t);
        const b = gullAt(i, floe, WIND, t + 1 / 30);
        expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeLessThan(0.3);
        expect(inLake(a.x, a.z)).toBe(true);
        if (!a.flying) {
          const on = floeSpot(floe, WIND, t);
          expect(Math.hypot(a.x - on.x, a.z - on.z)).toBeLessThan(1e-9);
          expect(a.y).toBe(0);
          expect(a.yaw).toBeCloseTo(Math.atan2(-WIND.x, -WIND.z));
        }
        if (!a.flying && b.flying) flights++;
      }
      expect(flights).toBe(3);
    });
  });

  it("keep standing with reduced motion", () => {
    const [floe] = gullFloes();
    expect(gullAt(0, floe!, WIND, 12, true)).toEqual(gullAt(0, floe!, WIND, 99, true));
    expect(gullAt(0, floe!, WIND, 12, true).flying).toBe(0);
  });
});
