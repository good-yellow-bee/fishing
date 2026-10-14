import { describe, expect, it } from "vitest";
import { DUCKLING_COUNT, DUCKLING_GAP, ducklingAt, ducklingsOut } from "./ducklingTrail";

describe("ducklings", () => {
  it("only in spring", () => {
    expect(ducklingsOut("spring")).toBe(true);
    expect(ducklingsOut("summer")).toBe(false);
  });

  it("paddle in a line behind the mother, wrapping round the loop", () => {
    for (let k = 0; k < DUCKLING_COUNT; k++) {
      const { along, weave } = ducklingAt(0.5, k, 3);
      expect(along).toBeCloseTo(0.5 - DUCKLING_GAP * (k + 1));
      expect(Math.abs(weave)).toBeLessThanOrEqual(0.08);
    }
    const wrapped = ducklingAt(0.01, 2, 0).along;
    expect(wrapped).toBeGreaterThan(0.9);
    expect(wrapped).toBeLessThan(1);
  });
});
