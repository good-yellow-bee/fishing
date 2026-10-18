import { describe, expect, it } from "vitest";
import { boatHeading, headToWind } from "./boatSwing";

/** Where a heading points the bow (model +z), as a unit vector. */
function bow(yaw: number) {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

describe("moored boats in the wind", () => {
  it("lie where they were left on a calm day, drifting only a little", () => {
    for (let t = 0; t < 60; t += 2) expect(Math.abs(boatHeading(0.72, { x: 0, z: 0 }, t, 1) - 0.72)).toBeLessThanOrEqual(0.04);
  });

  it("swing their bow round into a breeze", () => {
    const east = { x: 0.06, z: 0 };
    const facing = bow(boatHeading(0.72, east, 0, 0, true));
    // The wind blows toward +x, so head to wind is pointing -x.
    expect(facing.x).toBeLessThan(-0.99);
    expect(bow(headToWind({ x: 0, z: 0.05 })).z).toBeCloseTo(-1);
  });

  it("turn the short way round, whatever their resting heading", () => {
    const wind = { x: 0, z: -0.06 };
    const target = headToWind(wind);
    for (const rest of [-3, -1, 0.5, 2.9, 7]) {
      const heading = boatHeading(rest, wind, 0, 0, true);
      expect(Math.abs(heading - rest)).toBeLessThanOrEqual(Math.PI + 1e-9);
      expect(Math.cos(heading - target)).toBeCloseTo(1);
    }
  });

  it("only half swing in a light air", () => {
    const light = boatHeading(0, { x: 0.025, z: 0 }, 0, 0, true);
    const full = boatHeading(0, { x: 0.08, z: 0 }, 0, 0, true);
    expect(Math.abs(light)).toBeGreaterThan(0.3);
    expect(Math.abs(light)).toBeLessThan(Math.abs(full));
  });

  it("sheer to and fro about the wind, and hold steady for reduced motion", () => {
    const wind = { x: 0.08, z: 0 };
    const headings = Array.from({ length: 120 }, (_, t) => boatHeading(0, wind, t, 0.5));
    expect(Math.max(...headings) - Math.min(...headings)).toBeGreaterThan(0.4);
    expect(Math.max(...headings) - Math.min(...headings)).toBeLessThan(0.8);
    expect(boatHeading(0, wind, 3, 0.5, true)).toBe(boatHeading(0, wind, 50, 1.2, true));
  });
});
