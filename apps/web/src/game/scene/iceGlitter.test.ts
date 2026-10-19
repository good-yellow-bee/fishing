import { describe, expect, it } from "vitest";
import { DOCK_PLANKS, inLake } from "@stillwater/shared";
import { CRYSTALS, DUST_BOX, crystalAt, diamondDustOut } from "./iceGlitter";

const STILL = { x: 0.02, z: 0.01 };

describe("diamond dust", () => {
  it("glitters on clear, still winter mornings and days", () => {
    expect(diamondDustOut("dawn", "clear", "winter", STILL)).toBe(true);
    expect(diamondDustOut("day", "clear", "winter", STILL)).toBe(true);
    expect(diamondDustOut("day", "overcast", "winter", STILL)).toBe(false);
    expect(diamondDustOut("dusk", "clear", "winter", STILL)).toBe(false);
    expect(diamondDustOut("day", "clear", "fall", STILL)).toBe(false);
    expect(diamondDustOut("day", "clear", "winter", { x: 0.2, z: 0 })).toBe(false);
  });

  it("hangs over open water in front of the dock", () => {
    expect(inLake(DUST_BOX.minX, DUST_BOX.minZ) && inLake(DUST_BOX.maxX, DUST_BOX.maxZ) && inLake(DUST_BOX.minX, DUST_BOX.maxZ)).toBe(true);
    expect(DUST_BOX.maxZ).toBeLessThan(DOCK_PLANKS.minZ);
  });

  it("keeps every crystal in the box, sinking smoothly, faded wherever it wraps round", () => {
    let flashes = 0;
    for (let i = 0; i < CRYSTALS; i += 3) {
      let last = crystalAt(i, 0, STILL);
      for (let t = 1 / 30; t < 60; t += 1 / 30) {
        const c = crystalAt(i, t, STILL);
        expect(c.y).toBeGreaterThanOrEqual(DUST_BOX.low);
        expect(c.y).toBeLessThanOrEqual(DUST_BOX.high);
        expect(c.flash).toBeGreaterThanOrEqual(0);
        expect(c.flash).toBeLessThanOrEqual(1);
        const moved = Math.hypot(c.x - last.x, c.y - last.y, c.z - last.z);
        if (moved > 0.5) expect(Math.max(c.flash, last.flash)).toBeLessThan(0.1);
        else expect(moved).toBeLessThan(0.02);
        if (c.flash > 0.8) flashes++;
        last = c;
      }
    }
    expect(flashes).toBeGreaterThan(100);
    expect(crystalAt(4, 2, STILL, true)).toEqual(crystalAt(4, 30, STILL, true));
  });
});
