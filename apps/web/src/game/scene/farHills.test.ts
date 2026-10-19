import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { FAR_HILLS, hillColor, hillFront } from "./farHills";

const lightness = (hex: string) => new THREE.Color(hex).getHSL({ h: 0, s: 0, l: 0 }).l;

describe("far hills", () => {
  it("lie under snow in winter, paler than in any other season", () => {
    for (const hill of FAR_HILLS) {
      for (const season of ["spring", "summer", "fall"] as const) {
        expect(lightness(hillColor(hill, "day", "winter"))).toBeGreaterThan(lightness(hillColor(hill, "day", season)) + 0.15);
      }
      expect(lightness(hillColor(hill, "night", "winter"))).toBeLessThan(lightness(hillColor(hill, "day", "winter")));
    }
  });

  it("find the front of the hills' face, and nothing off them", () => {
    const [x, y, z] = FAR_HILLS[1]!.position;
    expect(hillFront(x, y)).toBeCloseTo(z + FAR_HILLS[1]!.scale[2]);
    expect(hillFront(0, 40)).toBeNull();
  });
});
