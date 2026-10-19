import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z } from "@stillwater/shared";
import { LUMPS, POWDER, POWDER_SEC, SHED_EVERY_SEC, lumpAt, powderAt, shedAt, shedPoint, shedTrees, snowShedOut } from "./snowShed";

const TREES = [
  { position: [-12, 0, -18] as const, scale: 4 },
  { position: [6, 0, -19] as const, scale: 5 },
  { position: [18, 0, -8] as const, scale: 4.5 },
  { position: [-5, 0, 12] as const, scale: 4 },
];
const CALM = { x: 0, z: 0 };

describe("snow shedding off the trees", () => {
  it("happens on winter dawns and days, not in fog or other seasons", () => {
    expect(snowShedOut("day", "clear", "winter")).toBe(true);
    expect(snowShedOut("dawn", "rain", "winter")).toBe(true);
    expect(snowShedOut("day", "fog", "winter")).toBe(false);
    expect(snowShedOut("dusk", "clear", "winter")).toBe(false);
    expect(snowShedOut("day", "clear", "fall")).toBe(false);
  });

  it("comes off trees across the water, from the crown's lakeward side", () => {
    const far = shedTrees(TREES);
    expect(far.map((t) => t.position[2])).toEqual([-18, -19, -8]);
    for (const tree of far) {
      const from = shedPoint(tree);
      expect(from.y).toBeGreaterThan(1.5);
      const before = Math.hypot(tree.position[0], tree.position[2] - LAKE_CENTER_Z);
      expect(Math.hypot(from.x, from.z - LAKE_CENTER_Z)).toBeLessThan(before);
    }
  });

  it("picks a tree each round, and lumps fall to the ground and are gone", () => {
    const far = shedTrees(TREES);
    const seen = new Set<number>();
    for (let r = 0; r < 40; r++) {
      const shed = shedAt(r * SHED_EVERY_SEC + 0.5, far)!;
      expect(shed.age).toBeCloseTo(0.5);
      seen.add(shed.tree);
    }
    expect(seen.size).toBeGreaterThan(1);
    expect(shedAt(3, [])).toBeNull();
    const from = shedPoint(far[0]!);
    for (let k = 0; k < LUMPS; k++) {
      let last = lumpAt(from, k, 0)!;
      for (let t = 0.02; t < 3; t += 0.02) {
        const lump = lumpAt(from, k, t);
        if (!lump) break;
        expect(lump.y).toBeLessThanOrEqual(last.y);
        last = lump;
      }
      expect(lumpAt(from, k, 3)).toBeNull();
    }
  });

  it("bursts powder that drifts downwind, thins away smoothly and stays above the ground", () => {
    const from = shedPoint(TREES[0]!);
    const wind = { x: 0.02, z: 0 };
    for (let k = 0; k < POWDER; k++) {
      let last = powderAt(from, k, 0, wind);
      for (let t = 0.05; t < POWDER_SEC + 0.5; t += 0.05) {
        const grain = powderAt(from, k, t, wind);
        expect(grain.y).toBeGreaterThan(0);
        expect(Math.hypot(grain.x - last.x, grain.y - last.y, grain.z - last.z)).toBeLessThan(0.4);
        if (t > 0.2) expect(grain.alpha).toBeLessThanOrEqual(last.alpha + 1e-9);
        last = grain;
      }
      expect(powderAt(from, k, POWDER_SEC, wind).alpha).toBe(0);
    }
    expect(powderAt(from, 0, POWDER_SEC * 0.9, wind).x).toBeGreaterThan(powderAt(from, 0, POWDER_SEC * 0.9, CALM).x);
  });
});
