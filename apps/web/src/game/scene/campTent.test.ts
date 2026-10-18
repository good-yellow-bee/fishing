import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { CABIN_AT } from "./cabinLook";
import { TENT_AT, TENT_YAW, tentGlow, tentPitched } from "./campTent";
import { kiteFlyer } from "./kiteFlight";
import { doorShape, tentShape } from "./Tent";

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

  it("builds the tent and its doorway", () => {
    for (const shape of [tentShape(), doorShape()]) {
      expect(shape.getAttribute("position").count).toBeGreaterThan(0);
      shape.dispose();
    }
  });
});
