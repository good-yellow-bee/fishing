import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { WREATHS, capCloudAmount, capCloudOut, capDrift, wreathAt } from "./capCloud";

const BREEZE = { x: 0.06, z: 0.02 };

describe("cap cloud", () => {
  it("hangs on the hills on grey and wet days, thicker in the rain", () => {
    expect(capCloudOut("day", "overcast", "summer")).toBe(true);
    expect(capCloudOut("night", "rain", "winter")).toBe(true);
    expect(capCloudOut("day", "clear", "summer")).toBe(false);
    expect(capCloudOut("dawn", "fog", "fall")).toBe(false);
    expect(capCloudAmount("rain")).toBeGreaterThan(capCloudAmount("overcast"));
  });

  it("keeps every wreath in front of the hills' face, along the ridge", () => {
    for (let t = 0; t < 600; t += 7) {
      for (let i = 0; i < WREATHS; i += 1) {
        const w = wreathAt(i, t, BREEZE, 1);
        expect(w.x).toBeGreaterThanOrEqual(-22);
        expect(w.x).toBeLessThan(22);
        for (const up of [-w.height / 2, 0, w.height / 2]) {
          const face = hillFront(w.x, w.y + up);
          if (face !== null) expect(w.z).toBeGreaterThan(face);
        }
      }
    }
  });

  it("drifts downwind, slowly, never quite still", () => {
    expect(capDrift(BREEZE)).toBeGreaterThan(0);
    expect(capDrift({ x: -0.06, z: 0 })).toBeLessThan(0);
    expect(Math.abs(capDrift({ x: 0, z: 0.1 }))).toBeGreaterThan(0);
    expect(Math.abs(capDrift({ x: 0.13, z: 0 }))).toBeLessThan(1);
  });

  it("comes lower in the rain and holds still under reduced motion", () => {
    expect(wreathAt(3, 0, BREEZE, 1).y).toBeLessThan(wreathAt(3, 0, BREEZE, 0.7).y);
    expect(wreathAt(5, 10, BREEZE, 1, true)).toEqual(wreathAt(5, 90, BREEZE, 1, true));
  });
});
