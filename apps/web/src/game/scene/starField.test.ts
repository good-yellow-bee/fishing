import { LAKE_CENTER_Z, inLake } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { SHOOTING_GAP, SHOOTING_SEC, shootingStar, skyPointReflection, STAR_COUNT, STAR_LOW, STAR_RADIUS, starAt, starOpacity, starReflection } from "./starField";

describe("starField", () => {
  it("keeps every star on the dome, above the treeline, the same each night", () => {
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const star = starAt(i);
      expect(Math.hypot(star.x, star.y, star.z)).toBeCloseTo(STAR_RADIUS);
      expect(star.y).toBeGreaterThanOrEqual(Math.sin(STAR_LOW) * STAR_RADIUS - 1e-9);
      expect(star.brightness).toBeGreaterThan(0.3);
      expect(star.brightness).toBeLessThanOrEqual(1);
    }
    expect(starAt(12)).toEqual(starAt(12));
  });

  it("shows stars only on a clear night, dimmer under a full moon", () => {
    expect(starOpacity(false, true, 0)).toBe(0);
    expect(starOpacity(true, false, 0)).toBe(0);
    expect(starOpacity(true, true, 1)).toBeLessThan(starOpacity(true, true, 0));
    expect(starOpacity(true, true, 1)).toBeGreaterThan(0.3);
  });

  it("sends one short shooting star across each gap", () => {
    for (let slot = 0; slot < 20; slot += 1) {
      let seen = 0;
      for (let t = slot * SHOOTING_GAP; t < (slot + 1) * SHOOTING_GAP; t += 0.05) if (shootingStar(t)) seen += 0.05;
      expect(seen).toBeGreaterThan(SHOOTING_SEC - 0.15);
      expect(seen).toBeLessThan(SHOOTING_SEC + 0.15);
    }
  });

  it("lays a star's reflection on the water along the mirrored sight line, and none off the lake", () => {
    const eye = { x: 0, y: 4, z: LAKE_CENTER_Z + 10 };
    const star = { x: 0, y: 40, z: -40, brightness: 1 };
    // 45 degrees up, so the reflection lands as far ahead as the eye is high.
    expect(starReflection(star, eye)).toEqual({ x: 0, z: eye.z - 4 });
    const low = { x: 0, y: 0.5, z: -84, brightness: 1 };
    const far = starReflection(low, eye);
    expect(far === null || inLake(far.x, far.z)).toBe(true);
    expect(starReflection(low, { x: 0, y: 4, z: LAKE_CENTER_Z })).toBeNull();
    expect(starReflection(star, { ...eye, y: -1 })).toBeNull();
  });
});

describe("sky point reflection", () => {
  const eye = { x: 0, y: 4, z: 13 };
  it("lands on the lake between the eye and the point, nearer the eye for a higher point", () => {
    const low = skyPointReflection([0, 20, -70], eye)!;
    const high = skyPointReflection([0, 50, -70], eye)!;
    expect(low.z).toBeLessThan(eye.z);
    expect(high.z).toBeGreaterThan(low.z);
  });
  it("is null when the point is under the water or the mirror misses the lake", () => {
    expect(skyPointReflection([0, -1, -70], eye)).toBeNull();
    expect(skyPointReflection([400, 2, -70], eye)).toBeNull();
  });
});
