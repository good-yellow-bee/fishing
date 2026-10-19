import { describe, expect, it } from "vitest";
import { DOCK_PLANKS, OPEN_PAD, inLake } from "@stillwater/shared";
import { MOORING } from "./boat";
import { CROSS_SEC, EVERY_SEC, driftSign, paperBoatAt, paperBoatOut } from "./paperDrift";

describe("paper boat", () => {
  it("drifts by on fine spring and summer days", () => {
    expect(paperBoatOut("day", "clear", "summer")).toBe(true);
    expect(paperBoatOut("day", "overcast", "spring")).toBe(true);
    expect(paperBoatOut("day", "rain", "summer")).toBe(false);
    expect(paperBoatOut("dusk", "clear", "summer")).toBe(false);
    expect(paperBoatOut("day", "clear", "fall")).toBe(false);
  });

  it("keeps to the water ahead of the dock, clear of the moored rowboat and the open-water spot", () => {
    for (const wind of [0.03, -0.03, 0]) {
      for (let t = 0; t < EVERY_SEC; t += 0.5) {
        const pose = paperBoatAt(t, wind);
        if (!pose.here) continue;
        expect(inLake(pose.x, pose.z)).toBe(true);
        expect(pose.z).toBeLessThan(DOCK_PLANKS.minZ - 1.2);
        expect(Math.hypot(pose.x - MOORING.x, pose.z - MOORING.z)).toBeGreaterThan(2);
        expect(Math.hypot(pose.x - OPEN_PAD.x, pose.z - OPEN_PAD.z)).toBeGreaterThan(1.5);
      }
    }
  });

  it("goes with the breeze across the view", () => {
    expect(driftSign(0.04)).toBe(1);
    expect(driftSign(-0.04)).toBe(-1);
    expect(driftSign(0)).toBe(1);
    const start = 20 + 1;
    expect(paperBoatAt(start + 30, 0.04).x).toBeGreaterThan(paperBoatAt(start, 0.04).x);
    expect(paperBoatAt(start + 30, -0.04).x).toBeLessThan(paperBoatAt(start, -0.04).x);
  });

  it("drifts slowly and smoothly, and is gone between crossings", () => {
    let last = paperBoatAt(20, 0);
    for (let t = 20.05; t < 20 + CROSS_SEC; t += 0.05) {
      const pose = paperBoatAt(t, 0);
      expect(pose.here).toBe(true);
      expect(Math.hypot(pose.x - last.x, pose.z - last.z)).toBeLessThan(0.02);
      last = pose;
    }
    expect(paperBoatAt(20 + CROSS_SEC + 5, 0).here).toBe(false);
  });

  it("floats still mid-way with reduced motion", () => {
    expect(paperBoatAt(3, 0, true)).toEqual(paperBoatAt(300, 0, true));
  });
});
