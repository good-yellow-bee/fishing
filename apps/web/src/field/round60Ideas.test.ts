import { describe, expect, it } from "vitest";
import { lureRate } from "./gear/GearPage";

describe("lure rate", () => {
  it("gives fish per outing to one decimal", () => {
    expect(lureRate(3, 4)).toBe("0.8");
    expect(lureRate(4, 2)).toBe("2");
  });
});
