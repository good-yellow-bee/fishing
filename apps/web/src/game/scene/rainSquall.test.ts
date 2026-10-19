import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { CROSS_SEC, SQUALL_EVERY_SEC, SQUALL_RINGS, squallAt, squallOut, squallRing } from "./rainSquall";

const nextSquall = (from: number) => {
  for (let t = from; t < from + SQUALL_EVERY_SEC + 1; t += 0.1) if (squallAt(t) && !squallAt(t - 0.1)) return t;
  throw new Error("no squall");
};

describe("rain squall", () => {
  it("comes with rain from spring to fall", () => {
    expect(squallOut(true, "summer")).toBe(true);
    expect(squallOut(true, "fall")).toBe(true);
    expect(squallOut(false, "summer")).toBe(false);
    expect(squallOut(true, "winter")).toBe(false);
  });

  it("sweeps across the lake one way and the next the other, thickening in and thinning out", () => {
    const first = nextSquall(0);
    const second = nextSquall(first + 1);
    const a0 = squallAt(first + 1)!;
    const a1 = squallAt(first + CROSS_SEC - 1)!;
    const b0 = squallAt(second + 1)!;
    const b1 = squallAt(second + CROSS_SEC - 1)!;
    expect(Math.sign(a1.x - a0.x)).toBe(-Math.sign(b1.x - b0.x));
    expect(a0.fade).toBeLessThan(0.2);
    expect(squallAt(first + CROSS_SEC / 2)!.fade).toBeCloseTo(1);
    expect(squallAt(first + CROSS_SEC / 2)!.x).toBeCloseTo(0, 0);
    expect(squallAt(first + CROSS_SEC + 1)).toBeNull();
    expect(squallAt(first + 5, true)).toBeNull();
  });

  it("boils the water with rings under it, only on the lake", () => {
    const mid = nextSquall(0) + CROSS_SEC / 2;
    let rings = 0;
    for (let t = mid; t < mid + 2; t += 0.1) {
      const squall = squallAt(t)!;
      for (let i = 0; i < SQUALL_RINGS; i++) {
        const ring = squallRing(i, t);
        if (!ring) continue;
        rings++;
        expect(inLake(ring.x, ring.z)).toBe(true);
        expect(Math.abs(ring.x - squall.x)).toBeLessThan(5);
        expect(ring.fade).toBeGreaterThanOrEqual(0);
      }
    }
    expect(rings).toBeGreaterThan(SQUALL_RINGS * 15);
  });
});
