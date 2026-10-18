import { describe, expect, it } from "vitest";
import { DOCK_STAND_X, DOCK_STAND_Z, inLake } from "@stillwater/shared";
import { CABIN_AT } from "./cabinLook";
import { CABIN_WINDOW_LIGHTS, GLINTS_PER_WINDOW, reflectionPoint, windowGlints } from "./cabinShine";

const DOCK_EYE = { x: DOCK_STAND_X, y: 2.6, z: DOCK_STAND_Z + 3 };

describe("cabin windows on the water", () => {
  it("puts both windows on the cabin's front, either side of its middle", () => {
    expect(CABIN_WINDOW_LIGHTS).toHaveLength(2);
    for (const light of CABIN_WINDOW_LIGHTS) {
      expect(Math.hypot(light.x - CABIN_AT.x, light.z - CABIN_AT.z)).toBeLessThan(2.5);
      expect(light.y).toBeGreaterThan(0.5);
    }
    const [a, b] = CABIN_WINDOW_LIGHTS;
    expect(Math.hypot(a!.x - b!.x, a!.z - b!.z)).toBeCloseTo(2 * 0.8 * 1.25);
  });

  it("finds the reflection where the eye's line to the mirrored window meets the water", () => {
    const eye = { x: 0, y: 2, z: 0 };
    const light = { x: 0, y: 2, z: -10 };
    expect(reflectionPoint(eye, light)).toEqual({ x: 0, z: -5 });
    // A higher eye sees the reflection further out.
    expect(reflectionPoint({ ...eye, y: 6 }, light).z).toBeLessThan(-5);
  });

  it("lays a streak of glints on the lake toward the angler on the dock", () => {
    for (let w = 0; w < CABIN_WINDOW_LIGHTS.length; w += 1) {
      const glints = windowGlints(w, DOCK_EYE, 3);
      expect(glints.length).toBeGreaterThan(GLINTS_PER_WINDOW / 2);
      for (const glint of glints) {
        expect(inLake(glint.x, glint.z)).toBe(true);
        expect(glint.alpha).toBeGreaterThanOrEqual(0);
        expect(glint.alpha).toBeLessThanOrEqual(1);
      }
    }
  });

  it("shows nothing when the reflection would fall on land", () => {
    const behindCabin = { x: CABIN_AT.x, y: 2, z: CABIN_AT.z - 3 };
    expect(windowGlints(0, behindCabin, 1)).toEqual([]);
  });

  it("holds the glints steady for reduced motion", () => {
    expect(windowGlints(1, DOCK_EYE, 2, true)).toEqual(windowGlints(1, DOCK_EYE, 9, true));
  });
});
