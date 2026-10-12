import { describe, expect, it } from "vitest";
import { inLake, spotAt, walkableAt } from "@stillwater/shared";
import { BANK_BOARDS, INLET_STAND, INLET_WALK } from "./bankWalk";
import {
  CREEK,
  CREEK_BANK,
  CREEK_FLOW,
  CREEK_HALF_WIDTH,
  CREEK_MOUTH,
  CREEK_ROCKS,
  CURRENT_MAX,
  creekDistance,
  creekRibbon,
  inletCurrent,
  nearCreek,
} from "./creek";
import { applyWaitShift, waitDrift } from "./waitMotion";

describe("creek", () => {
  it("runs out of the lake's inlet corner and away from it", () => {
    expect(CREEK_MOUTH.x).toBeLessThanOrEqual(-14);
    expect(CREEK_MOUTH.z).toBeLessThanOrEqual(-4);
    // The mouth sits at the waterline; every point upstream is dry land.
    for (const p of CREEK.slice(1)) expect(inLake(p.x, p.z)).toBe(false);
    expect(CREEK_FLOW.x).toBeGreaterThan(0);
  });

  it("never crosses the inlet walk, its boards, or the stand", () => {
    const wet = CREEK_HALF_WIDTH * 1.25 + CREEK_BANK;
    for (const p of [...INLET_WALK, INLET_STAND]) expect(creekDistance(p.x, p.z)).toBeGreaterThan(wet + 0.5);
    for (const b of BANK_BOARDS) expect(creekDistance(b.x, b.z)).toBeGreaterThan(wet + 0.3);
  });

  it("keeps walkable ground out of the water", () => {
    for (let x = -40; x <= -18; x += 0.25) {
      for (let z = -16; z <= -6; z += 0.25) {
        if (creekDistance(x, z) <= CREEK_HALF_WIDTH * 1.25) expect(walkableAt(x, z)).toBe(false);
      }
    }
  });

  it("puts every rock on a bank, not in the stream", () => {
    for (const rock of CREEK_ROCKS) {
      const d = creekDistance(rock.x, rock.z);
      expect(d).toBeGreaterThan(CREEK_HALF_WIDTH * 0.6);
      expect(nearCreek(rock.x, rock.z)).toBe(true);
    }
  });

  it("builds one quad per segment, facing up", () => {
    const { positions, uvs, indices } = creekRibbon(CREEK_HALF_WIDTH);
    expect(positions).toHaveLength(CREEK.length * 6);
    expect(uvs).toHaveLength(CREEK.length * 4);
    expect(indices).toHaveLength((CREEK.length - 1) * 6);
    const v = (i: number) => [positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!] as const;
    for (let t = 0; t < indices.length; t += 3) {
      const [a, b, c] = [v(indices[t]!), v(indices[t + 1]!), v(indices[t + 2]!)];
      const ux = b[0] - a[0];
      const uz = b[2] - a[2];
      const wx = c[0] - a[0];
      const wz = c[2] - a[2];
      // y of (b - a) × (c - a)
      expect(uz * wx - ux * wz).toBeGreaterThan(0);
    }
  });
});

describe("inlet current", () => {
  it("does nothing off the inlet", () => {
    for (const [x, z] of [[0, -6], [-10, 5], [12, 4], [-5, 3]] as const) {
      expect(spotAt(x, z)).not.toBe("inlet");
      expect(inletCurrent(x, z, 1.3)).toEqual({ x: 0, z: 0 });
    }
  });

  it("carries the float out of the creek mouth, harder close in", () => {
    const near = inletCurrent(-18.2, -7.6, 0);
    const far = inletCurrent(-15, -5.2, 0);
    expect(spotAt(-18.2, -7.6)).toBe("inlet");
    expect(near.x * CREEK_FLOW.x + near.z * CREEK_FLOW.z).toBeGreaterThan(0);
    expect(Math.hypot(near.x, near.z)).toBeGreaterThan(Math.hypot(far.x, far.z));
    for (let t = 0; t < 20; t += 0.7) expect(Math.hypot(...Object.values(inletCurrent(-18.2, -7.6, t)) as [number, number])).toBeLessThanOrEqual(CURRENT_MAX);
  });

  it("drifts a waiting bobber at the inlet further than the same chop elsewhere, and keeps it in the lake", () => {
    let withCurrent = 0;
    let chopOnly = 0;
    for (let i = 0; i < 40; i += 1) {
      const t = i * 0.31;
      const shifted = applyWaitShift(-18.2, -7.6, INLET_STAND.x, INLET_STAND.z, t, 0);
      expect(inLake(shifted.x, shifted.z)).toBe(true);
      withCurrent += Math.hypot(shifted.x + 18.2, shifted.z + 7.6);
      const chop = waitDrift(-18.2, -7.6, t);
      chopOnly += Math.hypot(chop.x, chop.z);
    }
    expect(withCurrent / 40).toBeGreaterThan(chopOnly / 40 + 0.1);
  });
});
