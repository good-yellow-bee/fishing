import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { CABIN_AT } from "./cabinLook";
import { lightGlints } from "./cabinShine";
import { CAMPERS_YAW, CAMP_FIRE_AT, CAMP_LIGHTS, CAMP_LOG_AT, TENT_AT, TENT_YAW, campersOut, tentGlow, tentPitched } from "./campTent";
import { kiteFlyer } from "./kiteFlight";
import { camperShape, doorShape, tentShape } from "./Tent";

describe("campers' tent", () => {
  it("is pitched from spring to fall", () => {
    expect(tentPitched("spring")).toBe(true);
    expect(tentPitched("fall")).toBe(true);
    expect(tentPitched("winter")).toBe(false);
  });

  it("stands on the far bank, out of the water and clear of the cabin and the kite flyer's spot", () => {
    expect(inLake(TENT_AT.x, TENT_AT.z)).toBe(false);
    expect(TENT_AT.z).toBeLessThan(-12);
    expect(Math.hypot(TENT_AT.x - CABIN_AT.x, TENT_AT.z - CABIN_AT.z)).toBeGreaterThan(3.5);
    for (const wind of [{ x: 0.08, z: 0 }, { x: 0, z: 0.08 }]) {
      const flyer = kiteFlyer(wind);
      expect(Math.hypot(TENT_AT.x - flyer.x, TENT_AT.z - flyer.z)).toBeGreaterThan(3);
    }
  });

  it("faces its door to the lake", () => {
    const ahead = { x: TENT_AT.x + Math.sin(TENT_YAW) * 4, z: TENT_AT.z + Math.cos(TENT_YAW) * 4 };
    expect(inLake(ahead.x, ahead.z)).toBe(true);
  });

  it("lights up from dusk, brightest at night, still on at dawn, and dark by day", () => {
    expect(tentGlow("day", 3)).toBe(0);
    expect(tentGlow("night", 3)).toBeGreaterThan(tentGlow("dusk", 3));
    expect(tentGlow("dawn", 3)).toBeGreaterThan(0);
    expect(tentGlow("dawn", 3)).toBeLessThan(tentGlow("dusk", 3));
  });

  it("flickers, unless motion is reduced", () => {
    const glows = Array.from({ length: 30 }, (_, i) => tentGlow("night", i * 0.13));
    expect(Math.max(...glows) - Math.min(...glows)).toBeGreaterThan(0.05);
    expect(tentGlow("night", 1, true)).toBe(tentGlow("night", 9, true));
  });

  it("lays the fire and the campers' log out in front of the tent, on dry land and apart", () => {
    for (const spot of [CAMP_FIRE_AT, CAMP_LOG_AT]) {
      expect(inLake(spot.x, spot.z)).toBe(false);
      expect(Math.hypot(spot.x - TENT_AT.x, spot.z - TENT_AT.z)).toBeGreaterThan(1.3);
    }
    expect(Math.hypot(CAMP_FIRE_AT.x - CAMP_LOG_AT.x, CAMP_FIRE_AT.z - CAMP_LOG_AT.z)).toBeGreaterThan(0.9);
    // Both nearer the lake than the tent.
    expect(Math.hypot(CAMP_FIRE_AT.x, CAMP_FIRE_AT.z + 2)).toBeLessThan(Math.hypot(TENT_AT.x, TENT_AT.z + 2));
  });

  it("sits the campers facing their fire from dusk into the night, unless it rains", () => {
    const ahead = { x: CAMP_LOG_AT.x + Math.sin(CAMPERS_YAW), z: CAMP_LOG_AT.z + Math.cos(CAMPERS_YAW) };
    expect(Math.hypot(ahead.x - CAMP_FIRE_AT.x, ahead.z - CAMP_FIRE_AT.z)).toBeLessThan(0.2);
    expect(campersOut("dusk", "clear")).toBe(true);
    expect(campersOut("night", "fog")).toBe(true);
    expect(campersOut("night", "rain")).toBe(false);
    expect(campersOut("day", "clear")).toBe(false);
  });

  it("mirrors the fire and the lantern on the water as seen from the dock", () => {
    const eye = { x: 0, y: 4.2, z: 15.5 };
    CAMP_LIGHTS.forEach((light, i) => {
      expect(inLake(light.x, light.z)).toBe(false);
      const glints = lightGlints(light, i, eye, 3);
      expect(glints.length).toBeGreaterThan(3);
      glints.forEach((glint) => expect(inLake(glint.x, glint.z)).toBe(true));
    });
  });

  it("builds the tent, its doorway and the campers", () => {
    for (const shape of [tentShape(), doorShape(), camperShape(0), camperShape(1)]) {
      expect(shape.getAttribute("position").count).toBeGreaterThan(0);
      shape.dispose();
    }
  });
});
