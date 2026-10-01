import { describe, expect, it } from "vitest";
import {
  CAST_RELEASE_SEC,
  castAlong,
  castBodyLean,
  castFlightSeconds,
  castLoft,
  thrownRodPitch,
} from "./castMotion.ts";

describe("cast arc", () => {
  it("lofts a longer cast higher and lets it fall onto the water", () => {
    expect(castLoft(0, 8, 0.6)).toBeCloseTo(0);
    expect(castLoft(1, 8, 0.6)).toBeCloseTo(0);
    expect(castLoft(0.35, 8, 0.7)).toBeGreaterThan(castLoft(0.35, 3, 0.3));
    expect(castLoft(0.35, 8, 0.7)).toBeGreaterThan(castLoft(0.75, 8, 0.7));
    expect(castFlightSeconds(10)).toBeGreaterThan(castFlightSeconds(3));
    expect(castAlong(0)).toBe(0);
    expect(castAlong(1)).toBe(1);
    expect(castAlong(0.4)).toBeGreaterThan(0.4);
  });

  it("whips the rod from the load through a follow-through", () => {
    const loaded = thrownRodPitch(0.7, 0, -0.4);
    expect(loaded).toBeCloseTo(-0.4);
    const release = thrownRodPitch(0.7, CAST_RELEASE_SEC, -0.4);
    const settled = thrownRodPitch(0.7, 2, -0.4);
    expect(release).toBeGreaterThan(loaded + 1);
    expect(settled).toBeGreaterThan(1);
    expect(settled).toBeLessThan(1.2);
    expect(castBodyLean(0.8, true, -1)).toBeLessThan(0);
    expect(castBodyLean(0.8, false, CAST_RELEASE_SEC)).toBeGreaterThan(0);
  });
});