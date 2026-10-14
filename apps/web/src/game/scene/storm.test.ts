import { describe, expect, it } from "vitest";
import { FLASH_MS, flashLevel, stormOn, strikeGap, STRIKE_GAP, thunderDelay } from "./storm";

describe("storms", () => {
  it("only brews on a strong-wind rain day outside winter", () => {
    expect(stormOn("rain", "summer", "strong")).toBe(true);
    expect(stormOn("rain", "fall", "strong")).toBe(true);
    expect(stormOn("rain", "winter", "strong")).toBe(false);
    expect(stormOn("rain", "summer", "breezy")).toBe(false);
    expect(stormOn("overcast", "summer", "strong")).toBe(false);
  });

  it("spaces the strikes out", () => {
    expect(strikeGap(0)).toBe(STRIKE_GAP.min);
    expect(strikeGap(1)).toBe(STRIKE_GAP.max);
  });

  it("brings a near strike's thunder sooner than a far one's", () => {
    expect(thunderDelay(1)).toBeLessThan(1);
    expect(thunderDelay(0)).toBeGreaterThan(thunderDelay(0.5));
  });

  it("blinks, dips, flickers again and fades out", () => {
    expect(flashLevel(-1)).toBe(0);
    expect(flashLevel(20)).toBe(1);
    expect(flashLevel(100)).toBeLessThan(flashLevel(160));
    expect(flashLevel(400)).toBeLessThan(flashLevel(250));
    expect(flashLevel(FLASH_MS)).toBe(0);
  });
});
