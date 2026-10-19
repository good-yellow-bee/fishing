import { describe, expect, it } from "vitest";
import { BREATH_EVERY, PUFF_BLOBS, PUFF_SEC, breathOut, dogPuffAge, puffAge, puffBlob } from "./breathPuff";

describe("breath puffs", () => {
  it("show at dawn and in winter only", () => {
    expect(breathOut("dawn", "summer")).toBe(true);
    expect(breathOut("night", "winter")).toBe(true);
    expect(breathOut("day", "summer")).toBe(false);
    expect(breathOut("dusk", "fall")).toBe(false);
  });

  it("come once a breath, and half as often with lite effects", () => {
    expect(puffAge(0.1)).toBeGreaterThan(0);
    expect(puffAge(PUFF_SEC + 0.1)).toBe(-1);
    expect(puffAge(BREATH_EVERY + 0.1)).toBeGreaterThan(0);
    expect(puffAge(BREATH_EVERY + 0.1, 2)).toBe(-1);
    expect(puffAge(BREATH_EVERY * 2 + 0.1, 2)).toBeGreaterThan(0);
  });

  it("blow out, swell, and fade to nothing", () => {
    for (let i = 0; i < PUFF_BLOBS; i++) {
      const early = puffBlob(i, 0.05);
      const late = puffBlob(i, 0.9);
      expect(late.forward).toBeGreaterThan(early.forward);
      expect(late.scale).toBeGreaterThan(early.scale);
      expect(puffBlob(i, 0).opacity).toBe(0);
      expect(puffBlob(i, 1).opacity).toBe(0);
      expect(puffBlob(i, 0.3).opacity).toBeGreaterThan(0.5);
    }
  });

  it("gives the dog quicker breaths than the angler, out of step with them", () => {
    const count = (age: (t: number) => number) => {
      let puffs = 0;
      let last = -1;
      for (let t = 0; t < 60; t += 0.02) {
        const a = age(t);
        if (a >= 0 && last < 0) puffs += 1;
        last = a;
      }
      return puffs;
    };
    expect(count((t) => dogPuffAge(t))).toBeGreaterThan(count((t) => puffAge(t)) * 1.3);
    expect(count((t) => dogPuffAge(t, 2))).toBeLessThan(count((t) => dogPuffAge(t)));
    let together = 0;
    for (let t = 0; t < 60; t += 0.1) if (Math.abs(dogPuffAge(t) - puffAge(t)) < 0.05 && puffAge(t) >= 0) together += 1;
    expect(together).toBeLessThan(60);
  });
});
