import { describe, expect, it } from "vitest";
import { CABIN_OVERHANG, CABIN_WALLS } from "./cabinLook";
import { BULB_COLORS, BULB_COUNT, TWINKLE_SEC, bulbAt, bulbGlow, eaveLightsOn, wireAt } from "./festiveBulbs";

describe("eave lights", () => {
  it("are up in winter from dusk through the night", () => {
    expect(eaveLightsOn("dusk", "winter")).toBe(true);
    expect(eaveLightsOn("night", "winter")).toBe(true);
    expect(eaveLightsOn("day", "winter")).toBe(false);
    expect(eaveLightsOn("night", "fall")).toBe(false);
  });

  it("hang the length of the front eave, under the roof and down to the windows' tops", () => {
    const { width: W, depth: D, height: H } = CABIN_WALLS;
    const first = bulbAt(0);
    const last = bulbAt(BULB_COUNT - 1);
    expect(first.x).toBeLessThan(-W / 2);
    expect(last.x).toBeGreaterThan(W / 2);
    for (let i = 0; i < BULB_COUNT; i++) {
      const bulb = bulbAt(i);
      expect(bulb.z).toBeGreaterThan(D / 2);
      expect(bulb.z).toBeLessThan(D / 2 + CABIN_OVERHANG);
      expect(bulb.y).toBeLessThan(H);
      // The windows' tops are at 1.225: the swags dip no further than just past them.
      expect(bulb.y).toBeGreaterThan(1.15);
    }
  });

  it("droop in swags, the hooks higher than the middles between them", () => {
    expect(wireAt(0).y).toBeCloseTo(wireAt(0.2).y);
    expect(wireAt(0.1).y).toBeLessThan(wireAt(0.2).y - 0.08);
  });

  it("cycle their colours along the string and glow them up in turn", () => {
    expect(new Set(Array.from({ length: BULB_COUNT }, (_, i) => bulbAt(i).color)).size).toBe(BULB_COLORS.length);
    expect(bulbAt(0).color).not.toBe(bulbAt(1).color);
    expect(bulbGlow(0, 0)).toBeCloseTo(1);
    expect(bulbGlow(2, 0)).toBeCloseTo(0.3);
    expect(bulbGlow(2, TWINKLE_SEC / 2)).toBeCloseTo(1);
    expect(bulbGlow(1, 3, true)).toBe(1);
  });
});
