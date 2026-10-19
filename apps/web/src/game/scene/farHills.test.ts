import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { FAR_HILLS, alpenglowOut, hillColor, hillFront } from "./farHills";

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

  it("glow pink at a clear winter dawn and dusk, and only dim under cloud", () => {
    const hill = FAR_HILLS[0]!;
    const warmth = (hex: string) => {
      const c = new THREE.Color(hex);
      return c.r - c.b;
    };
    expect(alpenglowOut("dawn", "clear", "winter")).toBe(true);
    expect(alpenglowOut("dusk", "partly-cloudy", "winter")).toBe(true);
    expect(alpenglowOut("dusk", "overcast", "winter")).toBe(false);
    expect(alpenglowOut("day", "clear", "winter")).toBe(false);
    expect(alpenglowOut("dawn", "clear", "fall")).toBe(false);
    const day = hillColor(hill, "day", "winter", "clear");
    const dawn = hillColor(hill, "dawn", "winter", "clear");
    const dusk = hillColor(hill, "dusk", "winter", "clear");
    expect(warmth(dawn)).toBeGreaterThan(warmth(day) + 0.1);
    expect(warmth(dusk)).toBeGreaterThan(warmth(day) + 0.1);
    expect(lightness(dusk)).toBeLessThan(lightness(dawn));
    const dull = hillColor(hill, "dusk", "winter", "overcast");
    expect(warmth(dull)).toBeLessThan(0);
    expect(lightness(dull)).toBeLessThan(lightness(day));
    expect(lightness(dull)).toBeGreaterThan(lightness(hillColor(hill, "night", "winter", "clear")));
  });

  it("find the front of the hills' face, and nothing off them", () => {
    const [x, y, z] = FAR_HILLS[1]!.position;
    expect(hillFront(x, y)).toBeCloseTo(z + FAR_HILLS[1]!.scale[2]);
    expect(hillFront(0, 40)).toBeNull();
  });
});
