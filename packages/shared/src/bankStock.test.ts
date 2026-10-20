import { describe, expect, it } from "vitest";
import { fishById } from "./fish.ts";
import { BANK_DOWN_FISH, downWeight, fishedDown } from "./bankStock.ts";

describe("a bank's stock across the week", () => {
  it("is fished down from BANK_DOWN_FISH fish in the week", () => {
    expect(fishedDown(BANK_DOWN_FISH - 1)).toBe(false);
    expect(fishedDown(BANK_DOWN_FISH)).toBe(true);
  });

  it("gives smaller fish, never under the kind's least", () => {
    const pike = fishById("pike")!;
    expect(downWeight(pike, pike.maxWeight)).toBeLessThan(pike.maxWeight);
    expect(downWeight(pike, pike.minWeight)).toBe(pike.minWeight);
    expect(downWeight(pike, pike.maxWeight)).toBeGreaterThan(pike.minWeight);
  });
});
