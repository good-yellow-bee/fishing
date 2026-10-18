import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { WHITECAP_LIFE_SEC, WHITECAP_MAX, whitecapAt, whitecapCount } from "./whitecapLife";
import { waterDepth } from "./water";

const BREEZY = { x: 0.08, z: 0 };
const STRONG = { x: 0, z: -0.13 };

function capsSeen(wind: { x: number; z: number }, seconds = 30) {
  const caps = [];
  for (let t = 0; t < seconds; t += 0.25) for (let i = 0; i < WHITECAP_MAX; i += 1) {
    const cap = whitecapAt(i, t, wind);
    if (cap) caps.push(cap);
  }
  return caps;
}

describe("whitecaps", () => {
  it("break only from a breezy day up, many more on a strong one", () => {
    expect(whitecapCount(0)).toBe(0);
    expect(whitecapCount(0.04)).toBe(0);
    expect(whitecapCount(0.08)).toBeGreaterThan(0);
    expect(whitecapCount(0.13)).toBeGreaterThan(whitecapCount(0.08) * 1.5);
    expect(whitecapCount(1)).toBe(WHITECAP_MAX);
    expect(capsSeen({ x: 0.04, z: 0 })).toHaveLength(0);
  });

  it("stay out on deep open water", () => {
    for (const cap of capsSeen(STRONG)) {
      expect(inLake(cap.x, cap.z)).toBe(true);
      expect(waterDepth(cap.x, cap.z)).toBeGreaterThanOrEqual(0.25);
    }
  });

  it("break bright, fade, and slide downwind while they show", () => {
    const caps = capsSeen(BREEZY, 10);
    expect(caps.length).toBeGreaterThan(0);
    for (const cap of caps) {
      expect(cap.alpha).toBeGreaterThanOrEqual(0);
      expect(cap.alpha).toBeLessThanOrEqual(1);
    }
    for (let t = 0; t < 30; t += 0.05) {
      const a = whitecapAt(3, t, STRONG);
      const b = whitecapAt(3, t + 0.3, STRONG);
      if (!a || !b || b.alpha > a.alpha) continue;
      // Same break: a strong north wind (toward -z) pushes it north.
      if (Math.hypot(a.x - b.x, a.z - b.z) < 1) {
        expect(b.z).toBeLessThan(a.z);
        return;
      }
    }
    throw new Error("no cap followed through its break");
  });

  it("show for a short life out of each cycle", () => {
    let shown = 0;
    let total = 0;
    for (let t = 0; t < 60; t += 0.1) {
      total += 1;
      if (whitecapAt(1, t, { x: 1, z: 0 })) shown += 1;
    }
    expect(shown / total).toBeLessThan(WHITECAP_LIFE_SEC / 2.8 + 0.05);
  });
});
