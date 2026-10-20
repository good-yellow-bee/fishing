import { describe, expect, it } from "vitest";
import { headlampTarget } from "./headlampBeam";

describe("the angler's headlamp", () => {
  const angler = { x: 1, y: 0.4, z: 2, yaw: Math.PI };
  const float = { x: -3, y: 0, z: -6 };

  it("shines on the float while it is out", () => {
    for (const phase of ["waiting", "hookset", "fight"] as const) expect(headlampTarget(phase, angler, float, () => 0.4)).toEqual(float);
  });

  it("otherwise lights the boards, the bank or the water a few steps ahead", () => {
    const ahead = headlampTarget("idle", angler, float, () => 0.4);
    expect(ahead.y).toBe(0.4);
    expect(ahead.z).toBeLessThan(angler.z - 2);
    expect(ahead.x).toBeCloseTo(angler.x);
  });
});
