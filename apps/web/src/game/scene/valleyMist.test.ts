import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ } from "@stillwater/shared";
import { hillFront } from "./farHills";
import { LIES, PUFFS, valleyMistOut, valleyPuff } from "./valleyMist";

const STILL = { x: 0.01, z: 0.01 };

describe("valley mist", () => {
  it("lies along the hills' foot only at a calm, clear dawn from spring to fall", () => {
    expect(valleyMistOut("dawn", "clear", "summer", STILL)).toBe(true);
    expect(valleyMistOut("dawn", "partly-cloudy", "fall", STILL)).toBe(true);
    expect(valleyMistOut("dawn", "overcast", "spring", STILL)).toBe(false);
    expect(valleyMistOut("dawn", "fog", "spring", STILL)).toBe(false);
    expect(valleyMistOut("day", "clear", "summer", STILL)).toBe(false);
    expect(valleyMistOut("dawn", "clear", "winter", STILL)).toBe(false);
    expect(valleyMistOut("dawn", "clear", "summer", { x: LIES, z: 0 })).toBe(false);
  });

  it("stays low behind the far shore, in front of the hills", () => {
    for (let i = 0; i < PUFFS; i += 1) {
      for (const time of [0, 17, 40, 95]) {
        const puff = valleyPuff(i, time);
        // Well back from the far shore's water at that x.
        const shore = LAKE_CENTER_Z - LAKE_RZ * Math.sqrt(Math.max(0, 1 - (puff.x / LAKE_RX) ** 2));
        expect(puff.z).toBeLessThan(shore - 1.5);
        expect(puff.y + puff.height / 2).toBeLessThan(2.5);
        const face = hillFront(puff.x, puff.y);
        if (face !== null) expect(puff.z).toBeGreaterThan(face);
      }
    }
  });

  it("drifts slowly, and holds still under reduced motion", () => {
    expect(Math.abs(valleyPuff(3, 1).x - valleyPuff(3, 0).x)).toBeLessThan(0.2);
    expect(valleyPuff(3, 20, true)).toEqual(valleyPuff(3, 70, true));
  });
});
