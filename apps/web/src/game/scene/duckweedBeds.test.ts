import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { DUCKWEED_BEDS, duckweedAmount, duckweedSpecks } from "./duckweedBeds";

const CALM = { x: 0, z: 0 };
const EAST = { x: 0.08, z: 0 };

function centre(specks: { x: number; z: number }[]) {
  return { x: specks.reduce((s, p) => s + p.x, 0) / specks.length, z: specks.reduce((s, p) => s + p.z, 0) / specks.length };
}

describe("duckweed in the still corners", () => {
  it("grows through summer, thins in fall and is gone in winter and spring", () => {
    expect(duckweedAmount("summer")).toBe(1);
    expect(duckweedAmount("fall")).toBeGreaterThan(0);
    expect(duckweedAmount("fall")).toBeLessThan(1);
    expect(duckweedAmount("winter")).toBe(0);
    expect(duckweedAmount("spring")).toBe(0);
  });

  it("floats only on the water, in patches by its corners and never out in the open", () => {
    const specks = duckweedSpecks(EAST);
    expect(specks.length).toBeGreaterThan(1500);
    expect(duckweedSpecks(EAST)).toEqual(specks);
    for (const speck of specks) {
      expect(inLake(speck.x, speck.z)).toBe(true);
      const near = DUCKWEED_BEDS.some((bed) => Math.hypot(speck.x - bed.x, speck.z - bed.z) < bed.radius * 1.6 + 0.8);
      expect(near).toBe(true);
    }
    for (const bed of DUCKWEED_BEDS) {
      expect(specks.filter((s) => Math.hypot(s.x - bed.x, s.z - bed.z) < bed.radius).length).toBeGreaterThan(100);
    }
  });

  it("lies thickest in the middle of a bed", () => {
    const bed = DUCKWEED_BEDS[0]!;
    const specks = duckweedSpecks(CALM);
    const core = specks.filter((s) => Math.hypot(s.x - bed.x, s.z - bed.z) < bed.radius * 0.35).length / 0.35 ** 2;
    const rim = specks.filter((s) => {
      const d = Math.hypot(s.x - bed.x, s.z - bed.z);
      return d > bed.radius * 0.65 && d < bed.radius;
    }).length / (1 - 0.65 ** 2);
    expect(core).toBeGreaterThan(rim * 1.5);
  });

  it("drifts a little downwind with the breeze", () => {
    const calm = centre(duckweedSpecks(CALM));
    const east = centre(duckweedSpecks(EAST));
    expect(east.x - calm.x).toBeGreaterThan(0.3);
    expect(Math.abs(east.z - calm.z)).toBeLessThan(0.3);
  });
});
