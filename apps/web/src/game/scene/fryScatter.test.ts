import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { BURST_EVERY_SEC, FRY, fryAt, fryBurst, fryOut, fryRing, frySwirl, spotsClear } from "./fryScatter";

const nextBurst = (from: number) => {
  for (let t = from; t < from + BURST_EVERY_SEC + 1; t += 0.02) if (fryBurst(t) && !fryBurst(t - 0.02)) return t;
  throw new Error("no burst");
};

describe("fry burst", () => {
  it("happens by daylight from spring to fall", () => {
    expect(fryOut("day", "summer")).toBe(true);
    expect(fryOut("dawn", "spring")).toBe(true);
    expect(fryOut("dusk", "fall")).toBe(true);
    expect(fryOut("night", "summer")).toBe(false);
    expect(fryOut("day", "winter")).toBe(false);
  });

  it("only hunts open water well clear of the dock", () => {
    expect(spotsClear()).toBe(true);
  });

  it("sprays the fry out in arcs that land back in the lake in a scatter of rings", () => {
    for (let n = 0; n < 4; n++) {
      const start = nextBurst(n * BURST_EVERY_SEC);
      let airborne = 0;
      let rings = 0;
      for (let t = start; t < start + 2.5; t += 0.02) {
        for (let i = 0; i < FRY; i++) {
          const fry = fryAt(i, t);
          if (fry) {
            airborne++;
            expect(fry.y).toBeGreaterThanOrEqual(-1e-9);
            expect(fry.y).toBeLessThan(0.65);
            expect(inLake(fry.x, fry.z)).toBe(true);
          }
          if (fryRing(i, t)) rings++;
        }
      }
      expect(airborne).toBeGreaterThan(FRY * 10);
      expect(rings).toBeGreaterThan(FRY * 10);
      expect(frySwirl(start + 0.5)).not.toBeNull();
    }
    expect(fryAt(0, nextBurst(0) + 0.3, true)).toBeNull();
  });

  it("is quiet between bursts", () => {
    const start = nextBurst(0);
    const lull = start + BURST_EVERY_SEC / 2;
    expect(frySwirl(lull)).toBeNull();
    expect(Array.from({ length: FRY }, (_, i) => fryAt(i, lull) ?? fryRing(i, lull)).some(Boolean)).toBe(false);
  });
});
