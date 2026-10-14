import { describe, expect, it } from "vitest";
import { lilyBloom, PETAL_COUNT, petalAngles } from "./lilyBloom";

describe("lilyBloom", () => {
  it("flowers in summer, buds in spring, and rests in fall and winter", () => {
    expect(lilyBloom("summer")).toBe("flower");
    expect(lilyBloom("spring")).toBe("bud");
    expect(lilyBloom("fall")).toBeNull();
    expect(lilyBloom("winter")).toBeNull();
  });

  it("spaces the petals evenly round the flower", () => {
    const angles = petalAngles();
    expect(angles).toHaveLength(PETAL_COUNT);
    expect(angles[1]! - angles[0]!).toBeCloseTo((Math.PI * 2) / PETAL_COUNT);
  });
});
