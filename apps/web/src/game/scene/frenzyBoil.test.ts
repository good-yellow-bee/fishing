import { spotAt, walkableAt } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { HOTSPOT_PERIOD_MS, hotspotAt, slotFrenzy } from "../hotspot";
import { BAITFISH, LEAP_SEC, baitfish, frenzyAmount } from "./frenzyBoil";
import { hotspotBubble } from "./hotspotBubbles";
import { waterHeight } from "./water";

describe("the frenzy's boil", () => {
  const frenzy = slotFrenzy(Date.UTC(2026, 9, 20, 12, 0));

  it("is still outside a frenzy, builds over its first seconds, boils in the middle and dies away at its end", () => {
    expect(frenzyAmount(frenzy.from - 1000)).toBe(0);
    expect(frenzyAmount(frenzy.to)).toBe(0);
    expect(frenzyAmount(frenzy.from + 500)).toBeGreaterThan(0);
    expect(frenzyAmount(frenzy.from + 500)).toBeLessThan(0.5);
    expect(frenzyAmount((frenzy.from + frenzy.to) / 2)).toBe(1);
    expect(frenzyAmount(frenzy.to - 500)).toBeLessThan(0.5);
  });

  it("sends baitfish leaping out of the patch over the water and splashing back, more of them the harder it boils", () => {
    let at = Date.UTC(2026, 9, 20);
    while (hotspotAt(at, 10).spot !== "dock") at += HOTSPOT_PERIOD_MS;
    const hotspot = hotspotAt(at, 10);
    let leaps = 0;
    let splashes = 0;
    for (let t = 0; t < LEAP_SEC * 6; t += 0.05) {
      for (let i = 0; i < BAITFISH; i += 1) {
        const { leap, splash } = baitfish(hotspot, i, t, 1);
        if (leap) {
          leaps += 1;
          expect(spotAt(leap.x, leap.z)).toBe(hotspot.spot);
          expect(walkableAt(leap.x, leap.z)).toBe(false);
          expect(Math.hypot(leap.x - hotspot.x, leap.z - hotspot.z)).toBeLessThan(2);
        }
        if (splash) splashes += 1;
        expect(baitfish(hotspot, i, t, 0)).toEqual({ leap: null, splash: null });
      }
    }
    expect(leaps).toBeGreaterThan(0);
    expect(splashes).toBeGreaterThan(0);
    const few = Array.from({ length: BAITFISH }, (_, i) => baitfish(hotspot, i, 0.2, 0.3)).filter((f) => f.leap || f.splash).length;
    expect(few).toBeLessThanOrEqual(Math.round(0.3 * BAITFISH));
  });

  it("keeps the bubbles on the water's own chop however far the frenzy has paced them on", () => {
    const hotspot = hotspotAt(Date.UTC(2026, 9, 20), 10);
    for (let i = 0; i < 14; i += 1) {
      const bubble = hotspotBubble(hotspot, i, 40, 127.3);
      if (bubble) expect(bubble.y - waterHeight(bubble.x, bubble.z, 40)).toBeCloseTo(0.06);
    }
  });
});
