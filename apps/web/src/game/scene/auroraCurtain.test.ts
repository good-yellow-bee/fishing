import { describe, expect, it } from "vitest";
import { AURORA_BASE, AURORA_COLUMNS, AURORA_PEAK, auroraOpacity, auroraOut, curtainColumn, curtainReflection } from "./auroraCurtain";

const day = (n: number) => new Date(2026, 0, 1 + n, 23);

describe("northern lights", () => {
  it("come out on some clear fall and winter nights only", () => {
    let nights = 0;
    for (let n = 0; n < 300; n += 1) if (auroraOut(day(n), "night", "clear", "winter")) nights += 1;
    expect(nights).toBeGreaterThan(60);
    expect(nights).toBeLessThan(140);
    for (let n = 0; n < 60; n += 1) {
      expect(auroraOut(day(n), "night", "clear", "summer")).toBe(false);
      expect(auroraOut(day(n), "dusk", "clear", "fall")).toBe(false);
      expect(auroraOut(day(n), "night", "overcast", "fall")).toBe(false);
    }
  });

  it("hold through the whole night", () => {
    const evening = new Date(2026, 0, 5, 21);
    const late = new Date(2026, 0, 5, 23, 50);
    expect(auroraOut(evening, "night", "clear", "fall")).toBe(auroraOut(late, "night", "clear", "fall"));
  });

  it("fades in to a soft peak", () => {
    expect(auroraOpacity(0)).toBe(0);
    expect(auroraOpacity(1000)).toBe(AURORA_PEAK);
  });

  it("hangs over the far shore, its ends fading, its folds moving", () => {
    for (let c = 0; c < AURORA_COLUMNS; c += 1) {
      const col = curtainColumn(c, 12);
      expect(col.z).toBeLessThan(-30);
      expect(col.top).toBeGreaterThan(AURORA_BASE + 10);
      expect(col.glow).toBeGreaterThanOrEqual(0);
      expect(col.glow).toBeLessThanOrEqual(1);
    }
    expect(curtainColumn(0, 0).glow).toBeCloseTo(0);
    expect(curtainColumn(AURORA_COLUMNS - 1, 0).glow).toBeCloseTo(0);
    const mid = Math.floor(AURORA_COLUMNS / 2);
    expect(curtainColumn(mid, 0).top).not.toBeCloseTo(curtainColumn(mid, 20).top);
  });

  it("mirrors into the lake between the dock and the far shore", () => {
    const eye = { x: 0, y: 3, z: 6 };
    const low = curtainReflection([0, AURORA_BASE, -78], eye);
    const high = curtainReflection([0, 30, -78], eye);
    expect(high.z).toBeGreaterThan(low.z);
    expect(high.z).toBeLessThan(eye.z);
  });
});
