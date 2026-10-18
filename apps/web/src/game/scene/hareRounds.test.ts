import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { FIRE_AT } from "./campfireSmoke";
import { FIRESIDE_AT } from "./catNap";
import { COVER, GRAZE, HARE_ROUND_SEC, hareAt, hareCoat, hareOut } from "./hareRounds";

describe("hare", () => {
  it("comes out at dawn and dusk, but not in the rain", () => {
    expect(hareOut("dawn", "clear")).toBe(true);
    expect(hareOut("dusk", "fog")).toBe(true);
    expect(hareOut("day", "clear")).toBe(false);
    expect(hareOut("night", "clear")).toBe(false);
    expect(hareOut("dusk", "rain")).toBe(false);
  });

  it("turns white for the winter", () => {
    expect(hareCoat("winter")).toBe("white");
    expect(hareCoat("summer")).toBe("brown");
    expect(hareCoat("fall")).toBe("brown");
  });

  it("keeps to dry land, clear of the campfire and the cat", () => {
    for (const spot of [COVER, ...GRAZE]) {
      expect(inLake(spot.x, spot.z)).toBe(false);
      expect(Math.hypot(spot.x - FIRE_AT.x, spot.z - FIRE_AT.z)).toBeGreaterThan(0.9);
      expect(Math.hypot(spot.x - FIRESIDE_AT.x, spot.z - FIRESIDE_AT.z)).toBeGreaterThan(1.2);
    }
  });

  it("hides in cover, hops out, grazes both patches and hops home each round", () => {
    const seen = { away: 0, hop: 0, graze: 0, sit: 0 };
    for (let t = 0; t < HARE_ROUND_SEC; t += 0.05) {
      const pose = hareAt(t);
      if (pose.away) seen.away += 1;
      else if (pose.y > 0.01) seen.hop += 1;
      else if (pose.upright > 0.9) seen.sit += 1;
      else seen.graze += 1;
      expect(pose.y).toBeLessThanOrEqual(0.13 + 1e-9);
    }
    expect(seen.away).toBeGreaterThan(0);
    expect(seen.hop).toBeGreaterThan(0);
    expect(seen.sit).toBeGreaterThan(0);
    expect(seen.graze).toBeGreaterThan(seen.hop);
    expect(hareAt(1).away).toBe(true);
    expect(hareAt(HARE_ROUND_SEC + 1).away).toBe(true);
  });

  it("moves smoothly, with no jumps between frames", () => {
    let last = hareAt(0);
    for (let t = 0.02; t < HARE_ROUND_SEC; t += 0.02) {
      const pose = hareAt(t);
      if (!pose.away && !last.away) expect(Math.hypot(pose.x - last.x, pose.z - last.z)).toBeLessThan(0.08);
      last = pose;
    }
  });

  it("holds still grazing for reduced motion", () => {
    const a = hareAt(3, true);
    const b = hareAt(40, true);
    expect(a).toEqual(b);
    expect(a.away).toBe(false);
    expect(a.x).toBeCloseTo(GRAZE[0]!.x);
  });
});
