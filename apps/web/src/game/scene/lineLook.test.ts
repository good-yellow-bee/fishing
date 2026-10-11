import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { LAKE_HOURS, SKIES } from "@stillwater/shared";
import { weatherLook } from "./LakeWorld";
import { lineLook } from "./lineLook";

function luminance(hex: string) {
  const c = new THREE.Color(hex);
  return c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
}

describe("lineLook", () => {
  it("keeps the line in strong contrast with the water at every hour and sky", () => {
    for (const hour of LAKE_HOURS) {
      for (const sky of SKIES) {
        const look = lineLook(hour);
        const water = luminance(weatherLook(hour, sky).water);
        const contrast = Math.abs(luminance(look.line) - water);
        expect(contrast, `${hour} ${sky}`).toBeGreaterThan(0.12);
      }
    }
  });

  it("pales the line and lights the float tip at night, and leaves the day line as it was", () => {
    expect(lineLook("night")).toMatchObject({ glowTip: true });
    expect(luminance(lineLook("night").line)).toBeGreaterThan(0.7);
    expect(lineLook("day")).toEqual({ line: "#1a1410", opacity: 0.55, glowTip: false });
    expect(lineLook("dawn").glowTip).toBe(false);
    expect(lineLook("dusk").glowTip).toBe(true);
  });
});
