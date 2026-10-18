import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { LAKE_HOUR_LOOK, weatherLook } from "./LakeWorld";
import { CAUSTIC_PER_GLINT, sunCaustics } from "./sunCaustics";

const at = (hour: keyof typeof LAKE_HOUR_LOOK, sky: Parameters<typeof weatherLook>[1], season: Parameters<typeof sunCaustics>[2] = "summer") =>
  sunCaustics(weatherLook(hour, sky), LAKE_HOUR_LOOK[hour].sun, season);

describe("sun caustics", () => {
  it("dance on the sand at full strength under a clear summer noon", () => {
    expect(at("day", "clear").opacity).toBeCloseTo(CAUSTIC_PER_GLINT);
  });

  it("need the sun itself: none under cloud, rain or fog", () => {
    for (const sky of ["overcast", "rain", "fog"] as const) expect(at("day", sky).opacity).toBe(0);
    expect(at("day", "partly-cloudy").opacity).toBeGreaterThan(0);
  });

  it("fade under the low winter sun", () => {
    const summer = at("day", "clear").opacity;
    expect(at("day", "clear", "winter").opacity).toBeLessThan(summer * 0.6);
    expect(at("day", "clear", "fall").opacity).toBeLessThan(summer);
  });

  it("take the sun's colour: warmer under the low sun of dawn and dusk than at noon", () => {
    const warmth = (hex: string) => {
      const c = new THREE.Color(hex);
      return c.r - c.b;
    };
    expect(warmth(at("dusk", "clear").color)).toBeGreaterThan(warmth(at("day", "clear").color));
    expect(warmth(at("dawn", "clear").color)).toBeGreaterThan(warmth(at("day", "clear").color));
  });
});
