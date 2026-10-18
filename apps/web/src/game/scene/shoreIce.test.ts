import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { ICE_LIGHT, RIM_MAX, RIM_MIN, RIM_STEPS, iceShards, rimWidth, shoreIceOut, shoreIceRim } from "./shoreIce";

describe("winter's shore ice", () => {
  it("skirts the bank in winter only", () => {
    expect(shoreIceOut("winter")).toBe(true);
    for (const season of ["spring", "summer", "fall"] as const) expect(shoreIceOut(season)).toBe(false);
  });

  it("reaches between its narrowest and widest off the bank, wider in some places than others", () => {
    const widths = Array.from({ length: RIM_STEPS }, (_, i) => rimWidth((i / RIM_STEPS) * Math.PI * 2));
    for (const w of widths) {
      expect(w).toBeGreaterThanOrEqual(RIM_MIN);
      expect(w).toBeLessThanOrEqual(RIM_MAX);
    }
    expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(1.2);
  });

  it("ends out on the water, its width off the bank", () => {
    const rim = shoreIceRim();
    expect(rim).toHaveLength(RIM_STEPS);
    rim.forEach(({ bank, edge }, i) => {
      expect(inLake(edge.x, edge.z)).toBe(true);
      expect(Math.hypot(bank.x - edge.x, bank.z - edge.z)).toBeCloseTo(rimWidth((i / RIM_STEPS) * Math.PI * 2), 5);
    });
  });

  it("sheds loose plates just off its edge, on the water", () => {
    for (const shard of iceShards()) {
      expect(inLake(shard.x, shard.z)).toBe(true);
      expect(shard.size).toBeGreaterThan(0.05);
    }
  });

  it("dims with the light, like the lake's other films", () => {
    expect(ICE_LIGHT.day).toBeGreaterThan(ICE_LIGHT.dawn);
    expect(ICE_LIGHT.dusk).toBeGreaterThan(ICE_LIGHT.night);
  });
});
