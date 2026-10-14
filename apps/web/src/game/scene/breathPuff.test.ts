import { describe, expect, it } from "vitest";
import { BREATH_EVERY, PUFF_BLOBS, PUFF_SEC, breathOut, puffAge, puffBlob } from "./breathPuff";

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
});
