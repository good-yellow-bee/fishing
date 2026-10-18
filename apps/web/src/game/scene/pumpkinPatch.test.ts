import { describe, expect, it } from "vitest";
import { FIRE_AT } from "./campfireSmoke";
import { NAP_AT } from "./catNap";
import { PUMPKINS, candleGlow, pumpkinsOut } from "./pumpkinPatch";
import { faceShape, pumpkinShape } from "./Pumpkins";
import { SWING_AT } from "./swingPendulum";

describe("pumpkins", () => {
  it("are out in fall only", () => {
    expect(pumpkinsOut("fall")).toBe(true);
    expect(pumpkinsOut("summer")).toBe(false);
    expect(pumpkinsOut("winter")).toBe(false);
  });

  it("sit apart from each other and clear of the cat, the fire and the swing, with one carved", () => {
    expect(PUMPKINS.filter((p) => p.carved)).toHaveLength(1);
    PUMPKINS.forEach((a, i) =>
      PUMPKINS.slice(i + 1).forEach((b) => expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(a.size + b.size)),
    );
    for (const p of PUMPKINS) {
      for (const spot of [NAP_AT, FIRE_AT, SWING_AT]) expect(Math.hypot(p.x - spot.x, p.z - spot.z)).toBeGreaterThan(0.8);
    }
  });

  it("lights the candle after dark, flickering, and not by day", () => {
    expect(candleGlow("day", 4)).toBe(0);
    expect(candleGlow("dawn", 4)).toBe(0);
    expect(candleGlow("night", 4)).toBeGreaterThan(0.6);
    const glows = Array.from({ length: 30 }, (_, i) => candleGlow("night", i * 0.11));
    expect(Math.max(...glows) - Math.min(...glows)).toBeGreaterThan(0.08);
    expect(candleGlow("night", 1, true)).toBe(candleGlow("night", 7, true));
  });

  it("presses the carved face onto the pumpkin's front, just proud of the skin", () => {
    const face = faceShape();
    const position = face.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = (position.getY(i) - 0.78) / 0.78;
      const z = position.getZ(i);
      expect(x * x + y * y + z * z).toBeGreaterThan(1);
      expect(z).toBeGreaterThan(0.5);
    }
    face.dispose();
    const pumpkin = pumpkinShape();
    expect(pumpkin.getAttribute("color")).toBeDefined();
    pumpkin.dispose();
  });
});
