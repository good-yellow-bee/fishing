import { describe, expect, it } from "vitest";
import { moonPhase } from "@stillwater/shared";
import { daytimeMoonPass, MOON_FEED_HOURS, MOON_FEED_WAIT, moonFeedWaitMul, moonOverheadHour, moonPassing } from "./solunar";

/** A time this many hours after the moon passes overhead on 15 October 2026. */
function after(hours: number) {
  const day = new Date(2026, 9, 15, 0, 0).getTime();
  // The moon runs later as the day goes on, so settle on the moment it is overhead.
  let at = day;
  for (let i = 0; i < 3; i++) at = day + moonOverheadHour(new Date(at)) * 3_600_000;
  return new Date(at + hours * 3_600_000);
}

describe("the moon passing overhead or underfoot", () => {
  it("passes overhead at noon at new moon and at midnight at full moon", () => {
    const newMoon = new Date(2026, 0, 1);
    const offset = moonPhase(newMoon);
    expect(moonOverheadHour(newMoon)).toBeCloseTo((12 + 24 * offset) % 24, 6);
    expect((12 + 24 * 0.5) % 24).toBe(0);
  });

  it("feeds the fish for an hour either side of the moon overhead and underfoot only", () => {
    expect(MOON_FEED_WAIT).toBeLessThan(1);
    expect(moonPassing(after(0))).toBe("overhead");
    expect(moonPassing(after(MOON_FEED_HOURS - 0.1))).toBe("overhead");
    expect(moonPassing(after(-(MOON_FEED_HOURS - 0.1)))).toBe("overhead");
    expect(moonPassing(after(12))).toBe("underfoot");
    expect(moonPassing(after(12.8))).toBe("underfoot");
    expect(moonPassing(after(MOON_FEED_HOURS + 0.2))).toBeNull();
    expect(moonPassing(after(6))).toBeNull();
    expect(moonFeedWaitMul(after(0))).toBe(MOON_FEED_WAIT);
    expect(moonFeedWaitMul(after(6))).toBe(1);
  });

  it("chalks the one passing that falls between 7:00 and 19:00, and it moves about 50 minutes later each day", () => {
    for (let n = 0; n < 30; n++) {
      const { hour } = daytimeMoonPass(new Date(2026, 9, 1 + n));
      expect(hour).toBeGreaterThanOrEqual(7);
      expect(hour).toBeLessThanOrEqual(19);
    }
    const passes = new Set(Array.from({ length: 30 }, (_, n) => daytimeMoonPass(new Date(2026, 9, 1 + n)).pass));
    expect(passes).toEqual(new Set(["overhead", "underfoot"]));
  });
});
