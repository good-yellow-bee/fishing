import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, OPEN_PAD, lakeEdge } from "@stillwater/shared";
import { ROW_SEC, SPIN_SEC, bladeUp, oarSweep, scullAt, scullCourse, scullOut, slideAt } from "./scullRow";

const CALM = { x: 0.04, z: 0 };

describe("sculler", () => {
  it("rows at dawn from spring to fall on calm, clear water", () => {
    expect(scullOut("dawn", "clear", "summer", CALM)).toBe(true);
    expect(scullOut("dawn", "overcast", "spring", CALM)).toBe(true);
    expect(scullOut("day", "clear", "summer", CALM)).toBe(false);
    expect(scullOut("dawn", "fog", "summer", CALM)).toBe(false);
    expect(scullOut("dawn", "clear", "winter", CALM)).toBe(false);
    expect(scullOut("dawn", "clear", "summer", { x: 0, z: 0.13 })).toBe(false);
  });

  it("keeps the course out on open water, with room for the oars, and well away from the boat's anchorage", () => {
    for (let u = 0; u <= 1; u += 0.05) {
      const at = scullCourse(u);
      const nx = at.x / LAKE_RX;
      const nz = (at.z - LAKE_CENTER_Z) / LAKE_RZ;
      // At least three metres in from the drawn waterline.
      expect(lakeEdge(Math.atan2(-nz, nx)) - Math.hypot(nx, nz)).toBeGreaterThan(3 / LAKE_RX);
      expect(Math.hypot(at.x - OPEN_PAD.x, at.z - OPEN_PAD.z)).toBeGreaterThan(5);
    }
  });

  it("never runs backward along the course, and spins round at its end", () => {
    let last = scullAt(0);
    for (let t = 0.05; t < ROW_SEC; t += 0.05) {
      const now = scullAt(t);
      expect(now.x).toBeGreaterThanOrEqual(last.x - 1e-9);
      expect(Math.hypot(now.x - last.x, now.z - last.z)).toBeLessThan(0.2);
      last = now;
    }
    const start = scullAt(ROW_SEC + 0.01);
    const done = scullAt(ROW_SEC + SPIN_SEC - 0.01);
    expect(start.going).toBe(0);
    expect(Math.hypot(done.x - start.x, done.z - start.z)).toBeLessThan(1e-9);
    expect(Math.abs(done.yaw - start.yaw - Math.PI)).toBeLessThan(0.01);
  });

  it("sweeps the oars through the water and carries them back above it", () => {
    expect(oarSweep(0)).toBeGreaterThan(0.6);
    expect(oarSweep(0.45)).toBeLessThan(-0.5);
    expect(bladeUp(0.2)).toBe(0);
    expect(bladeUp(0.7)).toBe(1);
    expect(slideAt(0)).toBe(1);
    expect(slideAt(0.45)).toBe(0);
  });

  it("holds still with reduced motion", () => {
    expect(scullAt(3, true)).toEqual(scullAt(300, true));
  });
});
