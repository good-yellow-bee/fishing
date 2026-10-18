import { describe, expect, it } from "vitest";
import { LAKE_SEASONS, inLake } from "@stillwater/shared";
import { FIRE_AT } from "./campfireSmoke";
import { DROPS_PER_PUDDLE, PUDDLES, puddleRing, puddlesOut } from "./rainPuddles";

describe("rain puddles by the shack", () => {
  it("lie on the ground only while it rains, and never in winter", () => {
    for (const season of LAKE_SEASONS) {
      expect(puddlesOut(true, season)).toBe(season !== "winter");
      expect(puddlesOut(false, season)).toBe(false);
    }
  });

  it("lie on dry land, clear of the campfire and of each other", () => {
    PUDDLES.forEach((puddle, i) => {
      expect(inLake(puddle.x, puddle.z)).toBe(false);
      expect(Math.hypot(puddle.x - FIRE_AT.x, puddle.z - FIRE_AT.z)).toBeGreaterThan(0.8);
      PUDDLES.slice(i + 1).forEach((other) => expect(Math.hypot(puddle.x - other.x, puddle.z - other.z)).toBeGreaterThan(1));
    });
  });

  it("are pricked by raindrops whose rings start inside the puddle and come and go", () => {
    PUDDLES.forEach((puddle, p) => {
      for (let i = 0; i < DROPS_PER_PUDDLE; i += 1) {
        const ages = Array.from({ length: 100 }, (_, k) => puddleRing(p, i, k * 0.05));
        expect(ages.some((ring) => ring.age < 0)).toBe(true);
        expect(ages.some((ring) => ring.age >= 0)).toBe(true);
        for (const ring of ages) expect(Math.hypot(ring.x - puddle.x, ring.z - puddle.z)).toBeLessThan(Math.max(puddle.rx, puddle.rz) * 0.6);
      }
    });
  });
});
