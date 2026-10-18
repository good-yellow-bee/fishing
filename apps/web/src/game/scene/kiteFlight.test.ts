import { describe, expect, it } from "vitest";
import { SHOP_X, SHOP_Z, inLake } from "@stillwater/shared";
import { REEDS_STAND } from "./bankWalk";
import { CABIN_AT } from "./cabinLook";
import { HANDS_Y, TAIL_BOWS, kiteAt, kiteFlyer, kiteOut, kiteTail } from "./kiteFlight";
import { flyerShape, kiteShape } from "./Kite";
import { OWL_TREE } from "./owlMotion";

const WINDS = [
  { x: 0, z: 0.08 },
  { x: 0, z: -0.08 },
  { x: 0.08, z: 0 },
  { x: -0.13, z: 0 },
];

describe("kite flight", () => {
  it("flies by day from spring to fall when there is a breeze", () => {
    expect(kiteOut("day", "clear", "summer", { x: 0.04, z: 0 })).toBe(true);
    expect(kiteOut("day", "clear", "summer", { x: 0, z: 0 })).toBe(false);
    expect(kiteOut("day", "rain", "summer", { x: 0.08, z: 0 })).toBe(false);
    expect(kiteOut("day", "clear", "winter", { x: 0.08, z: 0 })).toBe(false);
    expect(kiteOut("dusk", "clear", "summer", { x: 0.08, z: 0 })).toBe(false);
  });

  it("stands on the bank the wind comes from, so the kite flies out over the lake", () => {
    for (const wind of WINDS) {
      const flyer = kiteFlyer(wind);
      expect(inLake(flyer.x, flyer.z)).toBe(false);
      // Upwind of the lake's middle.
      expect(flyer.x * wind.x + (flyer.z + 2) * wind.z).toBeLessThan(0);
      for (const t of [0, 7, 19, 33]) {
        const kite = kiteAt(t, wind);
        expect(inLake(kite.x, kite.z)).toBe(true);
        expect(kite.y).toBeGreaterThan(HANDS_Y + 2);
        expect(kite.y).toBeLessThan(8);
      }
    }
  });

  it("keeps the child clear of the cabin, the owl's tree, the reeds stand, the dock and the shack", () => {
    for (const wind of WINDS) {
      const flyer = kiteFlyer(wind);
      for (const spot of [CABIN_AT, OWL_TREE, REEDS_STAND, { x: SHOP_X, z: SHOP_Z }]) {
        expect(Math.hypot(flyer.x - spot.x, flyer.z - spot.z)).toBeGreaterThan(2.5);
      }
      if (flyer.z > 4) expect(Math.abs(flyer.x)).toBeGreaterThan(3);
    }
  });

  it("swoops from side to side over time", () => {
    const wind = { x: 0, z: 0.08 };
    const xs = Array.from({ length: 60 }, (_, i) => kiteAt(i * 0.5, wind).x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(2);
  });

  it("trails its tail below and behind it", () => {
    const wind = { x: 0.08, z: 0 };
    const kite = kiteAt(10, wind);
    const tail = kiteTail(10, wind);
    expect(tail).toHaveLength(TAIL_BOWS);
    tail.forEach((bow, i) => expect(bow.y).toBeLessThan(i === 0 ? kite.y : tail[i - 1]!.y));
  });

  it("holds steady for reduced motion", () => {
    const wind = { x: 0, z: 0.08 };
    expect(kiteAt(2, wind, true)).toEqual(kiteAt(50, wind, true));
    expect(kiteTail(2, wind, true)).toEqual(kiteTail(50, wind, true));
  });

  it("builds the child and the kite", () => {
    for (const shape of [flyerShape(), kiteShape()]) {
      expect(shape.getAttribute("position").count).toBeGreaterThan(0);
      shape.dispose();
    }
  });
});
