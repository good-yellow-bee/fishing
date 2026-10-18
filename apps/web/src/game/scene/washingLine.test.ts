import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { LINE_FROM, LINE_SAG, LINE_TO, LINE_Y, WASHING, garmentSwing, linePoint, washingOut } from "./washingLine";

describe("washing line", () => {
  it("puts the washing out on dry days from spring to fall", () => {
    expect(washingOut("day", "clear", "summer")).toBe(true);
    expect(washingOut("day", "overcast", "spring")).toBe(true);
    expect(washingOut("day", "rain", "summer")).toBe(false);
    expect(washingOut("day", "fog", "fall")).toBe(false);
    expect(washingOut("day", "clear", "winter")).toBe(false);
    expect(washingOut("dusk", "clear", "summer")).toBe(false);
    expect(washingOut("night", "clear", "summer")).toBe(false);
  });

  it("stands both posts on dry land", () => {
    expect(inLake(LINE_FROM.x, LINE_FROM.z)).toBe(false);
    expect(inLake(LINE_TO.x, LINE_TO.z)).toBe(false);
  });

  it("ties the line at the posts and sags it most in the middle", () => {
    expect(linePoint(0).y).toBeCloseTo(LINE_Y);
    expect(linePoint(1).y).toBeCloseTo(LINE_Y);
    expect(linePoint(0.5).y).toBeCloseTo(LINE_Y - LINE_SAG);
    expect(linePoint(0).x).toBeCloseTo(LINE_FROM.x);
    expect(linePoint(1).x).toBeCloseTo(LINE_TO.x);
  });

  it("keeps the washing on the line and clear of the grass", () => {
    for (const garment of WASHING) {
      expect(garment.at).toBeGreaterThan(0);
      expect(garment.at).toBeLessThan(1);
      expect(linePoint(garment.at).y - garment.height).toBeGreaterThan(0.5);
    }
  });

  it("blows the washing out downwind, further on a windy day", () => {
    // Wind toward +z lifts the hem toward +z: a negative turn about x.
    expect(garmentSwing(0, 0, { x: 0, z: 0.13 }, true)).toBeLessThan(-1);
    expect(garmentSwing(0, 0, { x: 0, z: -0.13 }, true)).toBeGreaterThan(1);
    expect(Math.abs(garmentSwing(0, 0, { x: 0, z: 0.03 }, true))).toBeLessThan(Math.abs(garmentSwing(0, 0, { x: 0, z: 0.1 }, true)));
    expect(garmentSwing(0, 0, { x: 0, z: 0 }, true)).toBeCloseTo(0);
  });

  it("hangs each garment on its own beat and holds it still for reduced motion", () => {
    const wind = { x: 0.05, z: 0.05 };
    expect(garmentSwing(0, 3, wind)).not.toBeCloseTo(garmentSwing(1, 3, wind));
    expect(garmentSwing(2, 1, wind, true)).toBe(garmentSwing(2, 7, wind, true));
    for (let t = 0; t < 20; t += 0.37) expect(Math.abs(garmentSwing(1, t, { x: 0, z: 1 }))).toBeLessThan(Math.PI / 2);
  });
});
