import { describe, expect, it } from "vitest";
import { CAST_RANGE } from "@stillwater/shared";
import { BANK_STANDS } from "./hotspot";
import { RISE_FRESH_MS, eveningRiseOn, isRiseCast, risesAt } from "./eveningRise";

describe("evening rise", () => {
  it("comes on only on still, dry, warm dusks", () => {
    expect(eveningRiseOn("dusk", "summer", "clear", "calm")).toBe(true);
    expect(eveningRiseOn("dusk", "spring", "overcast", "light-west")).toBe(true);
    expect(eveningRiseOn("day", "summer", "clear", "calm")).toBe(false);
    expect(eveningRiseOn("dusk", "fall", "clear", "calm")).toBe(false);
    expect(eveningRiseOn("dusk", "summer", "rain", "calm")).toBe(false);
    expect(eveningRiseOn("dusk", "summer", "clear", "strong")).toBe(false);
  });

  it("keeps a few fresh rises in casting reach of the bank, each born in the past", () => {
    for (let now = 1_000_000; now < 1_060_000; now += 750) {
      const rises = risesAt("dock", now);
      expect(rises.length).toBeGreaterThan(0);
      expect(rises.length).toBeLessThanOrEqual(5);
      for (const rise of rises) {
        expect(now - rise.bornAt).toBeGreaterThanOrEqual(0);
        expect(now - rise.bornAt).toBeLessThan(RISE_FRESH_MS);
        expect(Math.hypot(rise.x - BANK_STANDS.dock.x, rise.z - BANK_STANDS.dock.z)).toBeLessThanOrEqual(CAST_RANGE);
      }
    }
  });

  it("counts a cast on a fresh rise and not one well away from every rise", () => {
    const now = 2_000_000;
    const rise = risesAt("reeds", now)[0]!;
    expect(isRiseCast("reeds", rise.x + 0.5, rise.z, now)).toBe(true);
    expect(isRiseCast("reeds", rise.x, rise.z, rise.bornAt + RISE_FRESH_MS + 30_000)).toBe(
      risesAt("reeds", rise.bornAt + RISE_FRESH_MS + 30_000).some((other) => Math.hypot(other.x - rise.x, other.z - rise.z) <= 1.3),
    );
    expect(isRiseCast("reeds", 500, 500, now)).toBe(false);
  });
});
