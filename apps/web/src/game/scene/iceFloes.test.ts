import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { FLOE_COUNT, floeSpot, floesOut, iceFloes } from "./iceFloes";
import { MOORING } from "./boat";

const EAST = { x: 0.08, z: 0 };

describe("pancake ice in the winter shallows", () => {
  it("floats only in winter", () => {
    expect(floesOut("winter")).toBe(true);
    expect(floesOut("fall")).toBe(false);
    expect(floesOut("spring")).toBe(false);
  });

  it("forms all over the shallows, apart from one another, clear of the dock and boat", () => {
    const floes = iceFloes();
    expect(floes).toHaveLength(FLOE_COUNT);
    expect(iceFloes()).toEqual(floes);
    expect(floes.filter((f) => f.x < 0).length).toBeGreaterThan(5);
    expect(floes.filter((f) => f.x > 0).length).toBeGreaterThan(5);
    for (const floe of floes) {
      for (let t = 0; t < 400; t += 13) {
        const at = floeSpot(floe, EAST, t);
        expect(inLake(at.x + floe.radius, at.z)).toBe(true);
        expect(inLake(at.x - floe.radius, at.z)).toBe(true);
        expect(Math.hypot(at.x - MOORING.x, at.z - MOORING.z)).toBeGreaterThan(1);
        expect(at.x > -1 && at.x < 1 && at.z > 5).toBe(false);
      }
      for (const other of floes) {
        if (other !== floe) expect(Math.hypot(other.x - floe.x, other.z - floe.z)).toBeGreaterThan(other.radius + floe.radius);
      }
    }
  });

  it("drift a little downwind and turn slowly", () => {
    const [floe] = iceFloes();
    const calm = Array.from({ length: 200 }, (_, t) => floeSpot(floe!, { x: 0, z: 0 }, t * 5).x);
    const east = Array.from({ length: 200 }, (_, t) => floeSpot(floe!, EAST, t * 5).x);
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(mean(east)).toBeGreaterThan(mean(calm) + 0.05);
    expect(floeSpot(floe!, EAST, 60).yaw).not.toBe(floeSpot(floe!, EAST, 0).yaw);
  });

  it("stay put for reduced motion", () => {
    const [floe] = iceFloes();
    expect(floeSpot(floe!, EAST, 5, true)).toEqual(floeSpot(floe!, EAST, 500, true));
  });
});
