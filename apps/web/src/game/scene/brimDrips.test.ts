import { describe, expect, it } from "vitest";
import { BRIM_UP, DRIP_FALL_SEC, DRIP_POINTS, dripAt, dripsOut } from "./brimDrips";

describe("brim drips", () => {
  it("drip in the rain, but not in winter or dry weather", () => {
    expect(dripsOut("rain", "summer")).toBe(true);
    expect(dripsOut("rain", "winter")).toBe(false);
    expect(dripsOut("clear", "summer")).toBe(false);
  });

  it("fall faster and faster, and reach the ground before the next one", () => {
    let seen = 0;
    for (let i = 0; i < DRIP_POINTS; i += 1) {
      for (let t = 0; t < 10; t += 0.07) {
        const now = dripAt(i, t);
        const later = dripAt(i, t + 0.05);
        if (!now || !later || later.drop < now.drop) continue;
        seen += 1;
        expect(later.drop).toBeGreaterThan(now.drop);
      }
    }
    expect(seen).toBeGreaterThan(20);
    expect(0.5 * 9.8 * DRIP_FALL_SEC * DRIP_FALL_SEC).toBeGreaterThan(BRIM_UP - 0.4);
  });

  it("leave gaps between drops", () => {
    const gaps = Array.from({ length: 100 }, (_, k) => dripAt(0, k * 0.05)).filter((d) => d === null);
    expect(gaps.length).toBeGreaterThan(10);
  });
});
