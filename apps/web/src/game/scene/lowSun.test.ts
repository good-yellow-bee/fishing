import { describe, expect, it } from "vitest";
import { lowSunShadow, lowSunShadows } from "./lowSun";
import { LAKE_HOUR_LOOK } from "./LakeWorld";

describe("long shadows of the low sun", () => {
  it("lie on the water at dawn and dusk under an open sky only", () => {
    expect(lowSunShadows("dawn", "clear")).toBe(true);
    expect(lowSunShadows("dusk", "partly-cloudy")).toBe(true);
    expect(lowSunShadows("dusk", "overcast")).toBe(false);
    expect(lowSunShadows("dawn", "rain")).toBe(false);
    expect(lowSunShadows("day", "clear")).toBe(false);
    expect(lowSunShadows("night", "clear")).toBe(false);
    expect(lowSunShadow("dusk")).toBeLessThan(lowSunShadow("dawn"));
  });

  it("come from a sun low in the south, behind the bank cameras, so they reach out over the water ahead", () => {
    for (const hour of ["dawn", "dusk"] as const) {
      const [x, y, z] = LAKE_HOUR_LOOK[hour].sunPos;
      const elevation = Math.atan2(y, Math.hypot(x, z)) * (180 / Math.PI);
      expect(elevation, hour).toBeLessThan(20);
      expect(z, hour).toBeGreaterThan(Math.abs(x) * 0.9);
    }
  });
});
