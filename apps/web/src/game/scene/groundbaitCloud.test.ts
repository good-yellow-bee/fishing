import { describe, expect, it } from "vitest";
import { spotAt, SPOT_IDS, walkableAt } from "@stillwater/shared";
import { GROUNDBAIT_CASTS, SWIM_MAX_CASTS, TOPUP_MAX } from "../logic";
import { cloudCenter, cloudOpacity, CLOUD_RADIUS, DIMPLES, dimpleAt } from "./groundbaitCloud";

describe("groundbait cloud", () => {
  it.each(SPOT_IDS)("lands on the %s's own open water", (spot) => {
    const at = cloudCenter(spot);
    expect(spotAt(at.x, at.z)).toBe(spot);
    expect(walkableAt(at.x, at.z)).toBe(false);
  });

  it("thins as its casts are fished out", () => {
    const fading = Array.from({ length: GROUNDBAIT_CASTS }, (_, i) => cloudOpacity(GROUNDBAIT_CASTS - i));
    expect([...fading].sort((a, b) => b - a)).toEqual(fading);
    expect(cloudOpacity(1)).toBeGreaterThan(0);
  });

  it("thickens on a swim topped up past a fresh handful, up to its most casts", () => {
    expect(cloudOpacity(GROUNDBAIT_CASTS + 2)).toBeGreaterThan(cloudOpacity(GROUNDBAIT_CASTS));
    expect(cloudOpacity(SWIM_MAX_CASTS)).toBeGreaterThan(cloudOpacity(SWIM_MAX_CASTS - 1));
    expect(cloudOpacity(SWIM_MAX_CASTS + 3)).toBe(cloudOpacity(SWIM_MAX_CASTS));
    expect(cloudOpacity(SWIM_MAX_CASTS)).toBeLessThan(0.6);
  });
});

describe("feeders dimpling over a gathered swim", () => {
  it("ring briefly and in turn, within the cloud", () => {
    let shown = 0;
    for (let t = 0; t < 60; t += 0.05) {
      const live = Array.from({ length: DIMPLES }, (_, i) => dimpleAt(i, t)).filter((d) => d.age < 1);
      shown += live.length;
      for (const d of live) expect(Math.hypot(d.dx, d.dz)).toBeLessThan(CLOUD_RADIUS);
      expect(live.length).toBeLessThan(DIMPLES + 1);
    }
    // On average one to three rings at a time.
    expect(shown / 1200).toBeGreaterThan(1);
    expect(shown / 1200).toBeLessThan(3.2);
  });

  it("ring more often over a swim built up, still one ring each", () => {
    const shown = (built: number) => {
      let live = 0;
      for (let t = 0; t < 60; t += 0.05) live += Array.from({ length: DIMPLES }, (_, i) => dimpleAt(i, t, built)).filter((d) => d.age < 1).length;
      return live / 1200;
    };
    expect(shown(1)).toBeGreaterThan(shown(0));
    expect(shown(TOPUP_MAX)).toBeGreaterThan(shown(1));
    expect(shown(TOPUP_MAX + 1)).toBe(shown(TOPUP_MAX));
    expect(shown(TOPUP_MAX)).toBeLessThan(DIMPLES);
  });

  it("moves each ring to a new place every round", () => {
    const first = dimpleAt(0, 0.1);
    const later = dimpleAt(0, 0.1 + 2.5);
    expect(Math.hypot(first.dx - later.dx, first.dz - later.dz)).toBeGreaterThan(0.01);
  });
});
