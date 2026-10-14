import { describe, expect, it } from "vitest";
import { RELEASE_DROP_SEC, RELEASE_REACH, RELEASE_RING_SEC, releaseDrop, releaseEntry, releasePitch, releasePoint, releaseRing } from "./releaseMotion";

const hand = { x: 1, y: 1.4, z: 4 };

describe("releasing a landed fish", () => {
  it("lowers it toward where it came out, never farther than an arm's toss", () => {
    const near = releaseEntry({ x: 0, z: 0 }, hand, { x: 1.5, z: 3.5 });
    expect(near).toEqual({ x: 1.5, z: 3.5 });
    const far = releaseEntry({ x: 0, z: 0 }, hand, { x: 1, z: -10 });
    expect(far.x).toBeCloseTo(1);
    expect(far.z).toBeCloseTo(4 - RELEASE_REACH);
  });

  it("starts in the hand, lobs up, and ends at the water nose down", () => {
    const entry = { x: 1, z: 2.4 };
    const at = (k: number) => releasePoint({ x: 0, y: 0, z: 0 }, hand, entry, 0.05, k);
    expect(at(0)).toEqual(hand);
    expect(at(0.25).y).toBeGreaterThan(hand.y);
    const end = at(1);
    expect(end.x).toBeCloseTo(1);
    expect(end.z).toBeCloseTo(2.4);
    expect(end.y).toBeCloseTo(0.05);
    expect(releasePitch(0)).toBeCloseTo(0);
    expect(releasePitch(1)).toBeLessThan(-1);
  });

  it("drops, then spreads one ring after it goes in", () => {
    expect(releaseDrop(-1)).toBe(-1);
    expect(releaseDrop(RELEASE_DROP_SEC / 2)).toBeCloseTo(0.5);
    expect(releaseDrop(RELEASE_DROP_SEC * 3)).toBe(1);
    expect(releaseRing(RELEASE_DROP_SEC / 2)).toBe(-1);
    expect(releaseRing(RELEASE_DROP_SEC + RELEASE_RING_SEC / 2)).toBeCloseTo(0.5);
    expect(releaseRing(RELEASE_DROP_SEC + RELEASE_RING_SEC)).toBe(-1);
  });
});
