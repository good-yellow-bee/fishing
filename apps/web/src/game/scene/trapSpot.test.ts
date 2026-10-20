import { describe, expect, it } from "vitest";
import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, SHOP_X, SHOP_Z, lakeEdge, walkableAt } from "@stillwater/shared";
import { LINE_FROM } from "./washingLine";
import { cageAt, CAGE_LENGTH, CAGE_RADIUS, CAGE_Y, FLIP_EVERY, FLIP_SEC, SHINER_HALF, TRAP_STAKE, shinerFlip } from "./trapSpot";

/** How far inside the drawn water's rim a point lies, as a share of the lake's radius there (negative on land). */
const inside = (x: number, z: number) => {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  return lakeEdge(Math.atan2(-nz, nx)) - Math.hypot(nx, nz);
};

describe("the shiner trap's spot", () => {
  it("stakes its cord on the bank below the shack and lies in the water out from it", () => {
    expect(inside(TRAP_STAKE.x, TRAP_STAKE.z)).toBeLessThan(0);
    expect(walkableAt(TRAP_STAKE.x, TRAP_STAKE.z)).toBe(true);
    const cage = cageAt();
    expect(inside(cage.x, cage.z)).toBeGreaterThan(0.03);
    expect(cage.z).toBeLessThan(TRAP_STAKE.z);
    expect(Math.hypot(TRAP_STAKE.x - SHOP_X, TRAP_STAKE.z - SHOP_Z)).toBeLessThan(4.5);
  });

  it("lies west of the washing line, clear of the boardwalk off the dock", () => {
    const cage = cageAt();
    expect(cage.x).toBeLessThan(LINE_FROM.x - 0.5);
    // The boardwalk's last boards reach x 1.32.
    expect(cage.x).toBeGreaterThan(2.3);
  });

  it("lies half out of the water", () => {
    expect(CAGE_Y + CAGE_RADIUS).toBeGreaterThan(0);
    expect(CAGE_Y).toBeLessThan(0);
  });

  it("flips a shiner in a ready trap now and then, inside the cage, and holds it still under reduced motion", () => {
    expect(shinerFlip(FLIP_SEC + 0.1, false)).toBeNull();
    let flips = 0;
    for (let t = 0; t < FLIP_EVERY * 6; t += 0.05) {
      const flip = shinerFlip(t, false);
      if (!flip) continue;
      flips += 1;
      expect(flip.y + SHINER_HALF).toBeLessThan(CAGE_Y + CAGE_RADIUS);
      expect(Math.abs(flip.along)).toBeLessThan(CAGE_LENGTH / 2);
    }
    expect(flips).toBeGreaterThan(0);
    expect(flips).toBeLessThan((FLIP_EVERY * 6) / 0.05 / 4);
    expect(shinerFlip(1, true)).toEqual(shinerFlip(2, true));
    expect(shinerFlip(1, true)!.y + SHINER_HALF).toBeLessThan(CAGE_Y + CAGE_RADIUS);
  });
});
