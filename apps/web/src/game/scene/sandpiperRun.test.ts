import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge } from "@stillwater/shared";
import { SANDPIPER_COUNT, STRIDE_SEC, sandpiperAt, sandpipersOut } from "./sandpiperRun";

const onLand = (x: number, z: number) => {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return Math.hypot(nx, nz) > lakeEdge(Math.atan2(-nz, nx));
};

describe("sandpipers", () => {
  it("pass through at dawn in spring and fall, not in fog, gone before the dog walker comes", () => {
    expect(sandpipersOut("dawn", "clear", "spring")).toBe(true);
    expect(sandpipersOut("day", "clear", "spring")).toBe(false);
    expect(sandpipersOut("dawn", "rain", "fall")).toBe(true);
    expect(sandpipersOut("day", "clear", "summer")).toBe(false);
    expect(sandpipersOut("dusk", "clear", "fall")).toBe(false);
    expect(sandpipersOut("dawn", "fog", "spring")).toBe(false);
  });

  it("stay on the sand just up from the water on the far bank, apart from each other", () => {
    for (let t = 0; t < 400; t += 0.37) {
      const birds = Array.from({ length: SANDPIPER_COUNT }, (_, i) => sandpiperAt(i, t));
      for (const b of birds) {
        expect(onLand(b.x, b.z)).toBe(true);
        expect(b.z).toBeLessThan(-14);
      }
      for (let i = 0; i < birds.length; i++)
        for (let j = i + 1; j < birds.length; j++) expect(Math.hypot(birds[i].x - birds[j].x, birds[i].z - birds[j].z)).toBeGreaterThan(0.1);
    }
  });

  it("move only while they run, and probe the sand while they stand", () => {
    let pecked = 0;
    for (let t = 0; t < 60; t += 0.05) {
      const a = sandpiperAt(0, t);
      const b = sandpiperAt(0, t + 0.05);
      const moved = Math.hypot(b.x - a.x, b.z - a.z);
      if (!a.run && !b.run) expect(moved).toBeLessThan(1e-9);
      expect(moved).toBeLessThan(0.1);
      if (a.peck > 0.5) {
        pecked++;
        expect(a.run).toBe(0);
      }
    }
    expect(pecked).toBeGreaterThan(10);
  });

  it("work along the shore and turn back at the ends of the stretch", () => {
    const xs = Array.from({ length: 200 }, (_, k) => sandpiperAt(0, k * STRIDE_SEC).x);
    const spread = Math.max(...xs) - Math.min(...xs);
    expect(spread).toBeGreaterThan(3);
    expect(spread).toBeLessThan(7);
    const yaws = Array.from({ length: 200 }, (_, k) => Math.sign(sandpiperAt(0, k * STRIDE_SEC).yaw));
    expect(new Set(yaws).size).toBe(2);
  });

  it("hold still with reduced motion", () => {
    expect(sandpiperAt(2, 3, true)).toEqual(sandpiperAt(2, 90, true));
    expect(sandpiperAt(2, 3, true).run).toBe(0);
  });
});
