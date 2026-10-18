import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { walkPath } from "./dogWalk";
import { EASEL_AT, PAINT_SEC, PAINTER_AT, STEP_BACK, UMBRELLA_AT, canvasFill, painterAt, painterOut } from "./pleinAir";

function onLand({ x, z }: { x: number; z: number }) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx)) + 0.03;
}

describe("painter on the far bank", () => {
  it("comes out by day from spring to fall on a clear, calm day", () => {
    const calm = { x: 0, z: 0 };
    expect(painterOut("day", "clear", "summer", calm)).toBe(true);
    expect(painterOut("day", "clear", "spring", calm)).toBe(true);
    expect(painterOut("day", "clear", "winter", calm)).toBe(false);
    expect(painterOut("dusk", "clear", "summer", calm)).toBe(false);
    expect(painterOut("day", "overcast", "summer", calm)).toBe(false);
    expect(painterOut("day", "clear", "summer", { x: 0.04, z: 0 })).toBe(false);
  });

  it("sets up on the far bank, all on land and clear of the dog walker's path, the canvas turned to the dock", () => {
    const path = Array.from({ length: 81 }, (_, i) => walkPath(i / 80));
    expect(PAINTER_AT.z).toBeLessThan(LAKE_CENTER_Z - LAKE_RZ * 0.8);
    for (const spot of [PAINTER_AT, EASEL_AT, UMBRELLA_AT]) {
      expect(onLand(spot)).toBe(true);
      expect(Math.min(...path.map((p) => Math.hypot(p.x - spot.x, p.z - spot.z)))).toBeGreaterThan(0.7);
    }
    // The canvas faces back at the painter; that face should look south, across the lake to the dock.
    const facing = { x: PAINTER_AT.x - EASEL_AT.x, z: PAINTER_AT.z - EASEL_AT.z };
    expect(facing.z).toBeGreaterThan(0);
    // The umbrella stands behind the painter as seen from the dock, not in front of the canvas.
    expect(UMBRELLA_AT.z).toBeLessThan(PAINTER_AT.z);
  });

  it("dabs at the canvas and now and then steps back to look, moving smoothly", () => {
    let dabs = 0;
    let looked = false;
    let last = painterAt(0);
    for (let t = 0.05; t < 60; t += 0.05) {
      const pose = painterAt(t);
      expect(pose.back).toBeGreaterThanOrEqual(0);
      expect(pose.back).toBeLessThanOrEqual(STEP_BACK + 1e-9);
      expect(pose.dab).toBeGreaterThanOrEqual(0);
      expect(pose.dab).toBeLessThanOrEqual(1);
      expect(Math.abs(pose.back - last.back)).toBeLessThan(0.05);
      expect(Math.abs(pose.dab - last.dab)).toBeLessThan(0.25);
      if (pose.dab > 0.9 && last.dab <= 0.9) dabs += 1;
      if (pose.back > STEP_BACK * 0.99) looked = true;
      // Never dabbing while stepped back.
      if (pose.back > 0.01) expect(pose.dab).toBe(0);
      last = pose;
    }
    expect(dabs).toBeGreaterThan(15);
    expect(looked).toBe(true);
  });

  it("fills the picture sky first, then the bank, then the water, and starts afresh", () => {
    let last = canvasFill(0);
    expect(last.sky + last.bank + last.water).toBe(0);
    for (let t = 1; t < PAINT_SEC; t += 1) {
      const fill = canvasFill(t);
      expect(fill.sky).toBeGreaterThanOrEqual(last.sky);
      expect(fill.bank).toBeLessThanOrEqual(fill.sky);
      expect(fill.water).toBeLessThanOrEqual(fill.bank);
      last = fill;
    }
    expect(last).toEqual({ sky: 1, bank: 1, water: 1 });
    expect(canvasFill(PAINT_SEC + 1).sky).toBe(0);
  });

  it("holds still at the easel with the picture half done under reduced motion", () => {
    expect(painterAt(3, true)).toEqual(painterAt(40, true));
    expect(painterAt(3, true).back).toBe(0);
    const fill = canvasFill(10, true);
    expect(fill.sky).toBe(1);
    expect(fill.water).toBe(0);
    expect(fill.bank).toBeGreaterThan(0);
  });
});
