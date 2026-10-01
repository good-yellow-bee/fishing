import { describe, expect, it } from "vitest";
import {
  MISS_POP_SEC,
  MISS_WHIP_SEC,
  missBobberLift,
  missBodyLean,
  missLineSag,
  missRodPitch,
  missRodRoll,
} from "./missMotion.ts";

describe("missed strike", () => {
  it("springs the loaded tip up past the rest pose, then rings back", () => {
    const loaded = 1.55;
    expect(missRodPitch(0, loaded)).toBeCloseTo(loaded);
    const sprung = missRodPitch(MISS_WHIP_SEC, loaded);
    expect(sprung).toBeLessThan(0.55);
    expect(sprung).toBeLessThan(loaded - 0.8);
    const back = missRodPitch(MISS_WHIP_SEC + 0.14, loaded);
    expect(back).toBeGreaterThan(sprung + 0.2);
    const settled = missRodPitch(1.15, loaded);
    expect(settled).toBeGreaterThan(0.9);
    expect(settled).toBeLessThan(1.2);
  });

  it("drops a tight line into a slack belly", () => {
    const tight = 0.045;
    expect(missLineSag(0, tight)).toBeCloseTo(tight);
    expect(missLineSag(0.36, tight)).toBeGreaterThan(tight + 0.5);
  });

  it("pops a dunked bobber above the float, then lets it sit", () => {
    const dunked = 0.36;
    expect(missBobberLift(0, dunked)).toBeCloseTo(-dunked);
    expect(missBobberLift(MISS_POP_SEC, dunked)).toBeGreaterThan(0.25);
    expect(missBobberLift(MISS_POP_SEC, dunked) - missBobberLift(0, dunked)).toBeGreaterThan(0.55);
    const sitting = missBobberLift(0.95, dunked);
    expect(sitting).toBeGreaterThan(-0.08);
    expect(sitting).toBeLessThan(0.08);
  });

  it("rocks the angler back and lets the tip's roll die", () => {
    expect(missBodyLean(0, 0.2)).toBeCloseTo(0.2);
    expect(missBodyLean(0.11, 0.2)).toBeLessThan(0);
    expect(Math.abs(missBodyLean(1.2, 0.2))).toBeLessThan(0.05);
    expect(missRodRoll(0, 0.16)).toBeCloseTo(0.16);
    expect(Math.abs(missRodRoll(0.85, 0.16))).toBeLessThan(0.04);
  });
});
