import { describe, expect, it } from "vitest";
import { AERATOR_BUBBLE_MAX, AERATOR_BUBBLES, AERATOR_CYCLE_SEC, AERATOR_RISE, aeratorBubble, TUBE_X, TUBE_Z } from "./aeratorBubbles";

const WATER = 0.16;

describe("the aerator's bubbles in the bait bucket", () => {
  it("break over the water near the tube, inside the bucket's rim", () => {
    for (let i = 0; i < AERATOR_BUBBLES; i += 1) {
      for (let time = 0; time < 20; time += 0.07) {
        const b = aeratorBubble(i, time, WATER);
        expect(b.y).toBeGreaterThanOrEqual(WATER);
        expect(b.y).toBeLessThanOrEqual(WATER + AERATOR_RISE);
        expect(Math.hypot(b.x - TUBE_X, b.z - TUBE_Z)).toBeLessThan(0.03);
        expect(Math.hypot(b.x, b.z)).toBeLessThan(0.094);
        expect(b.size).toBeGreaterThanOrEqual(0);
        expect(b.size).toBeLessThanOrEqual(AERATOR_BUBBLE_MAX);
      }
    }
  });

  it("swell, pop, and rise again somewhere a little aside", () => {
    const start = aeratorBubble(0, 0, WATER);
    const peak = aeratorBubble(0, AERATOR_CYCLE_SEC * 0.4, WATER);
    const popped = aeratorBubble(0, AERATOR_CYCLE_SEC * 0.9, WATER);
    const next = aeratorBubble(0, AERATOR_CYCLE_SEC * 1.4, WATER);
    expect(start.size).toBe(0);
    expect(peak.size).toBeCloseTo(AERATOR_BUBBLE_MAX);
    expect(popped.size).toBeCloseTo(0);
    expect(Math.hypot(next.x - peak.x, next.z - peak.z)).toBeGreaterThan(0.001);
  });

  it("hold the same shape at the same moment, for reduced motion", () => {
    expect(aeratorBubble(3, 8, WATER)).toEqual(aeratorBubble(3, 8, WATER));
  });
});
