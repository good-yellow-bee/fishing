import { describe, expect, it } from "vitest";
import { headlampTarget, lampMothShow } from "./headlampBeam";
import { mothRound } from "./mothOrbit";

describe("the angler's headlamp", () => {
  const angler = { x: 1, y: 0.4, z: 2, yaw: Math.PI };
  const float = { x: -3, y: 0, z: -6 };

  it("shines on the float while it is out", () => {
    for (const phase of ["casting", "waiting", "hookset", "fight"] as const) expect(headlampTarget({ x: 0, y: 0, z: 0 }, phase, angler, float, () => 0.4)).toEqual(float);
  });

  it("otherwise lights the boards, the bank or the water a few steps ahead", () => {
    const ahead = headlampTarget({ x: 0, y: 0, z: 0 }, "idle", angler, float, (x, z) => x - z);
    expect(ahead.y).toBe(ahead.x - ahead.z);
    expect(ahead.z).toBeLessThan(angler.z - 2);
    expect(ahead.x).toBeCloseTo(angler.x);
  });
});

describe("moths at the headlamp", () => {
  it("come one by one after it goes on, fluttering into view, and not in winter", () => {
    expect(lampMothShow(0, 2, "summer")).toBe(0);
    expect(lampMothShow(0, 4.4, "summer")).toBeGreaterThan(0);
    expect(lampMothShow(0, 4.4, "summer")).toBeLessThan(1);
    expect(lampMothShow(0, 6, "summer")).toBe(1);
    expect(lampMothShow(2, 10, "summer")).toBe(0);
    expect(lampMothShow(2, 20, "fall")).toBe(1);
    expect(lampMothShow(1, 60, "winter")).toBe(0);
  });

  it("loop close round the light they find", () => {
    const light = { x: 2, y: 1.5, z: -3 };
    for (let t = 0; t < 10; t += 0.37) {
      const moth = mothRound(1, t, light);
      expect(Math.hypot(moth.x - light.x, moth.z - light.z)).toBeLessThan(0.4);
      expect(Math.abs(moth.y - light.y - 0.12)).toBeLessThan(0.2);
    }
  });
});
