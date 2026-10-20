import { describe, expect, it } from "vitest";
import { inLake, spotAt } from "@stillwater/shared";
import { SWIRL_EVERY, SWIRL_SEC, giantWaterAt, swirlPhase, swirlTurn } from "./giantWake";

describe("signs of a bank's giant", () => {
  it("rolls out on each bank's own water", () => {
    for (const bank of ["dock", "point", "reeds", "dropoff", "inlet"] as const) {
      const at = giantWaterAt(bank)!;
      expect(inLake(at.x, at.z), bank).toBe(true);
      expect(spotAt(at.x, at.z), bank).toBe(bank);
    }
    expect(giantWaterAt("open")).toBeNull();
  });

  it("swirls briefly and rarely, the banks taking turns", () => {
    const shown = Array.from({ length: SWIRL_EVERY * 10 }, (_, i) => swirlPhase(i / 10, 0) !== null).filter(Boolean).length;
    expect(shown / (SWIRL_EVERY * 10)).toBeCloseTo(SWIRL_SEC / SWIRL_EVERY, 2);
    expect(swirlPhase(5, 0)).toBeCloseTo(swirlPhase(5 + SWIRL_EVERY, 0)!, 6);
    const turns = (["dock", "point", "reeds", "dropoff", "inlet"] as const).map(swirlTurn);
    expect(new Set(turns).size).toBe(5);
    for (let t = 0; t < SWIRL_EVERY; t += 0.1) expect(turns.filter((turn) => swirlPhase(t, turn) !== null).length).toBeLessThanOrEqual(1);
  });
});
