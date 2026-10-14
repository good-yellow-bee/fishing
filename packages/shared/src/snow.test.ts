import { describe, expect, it } from "vitest";
import { isSnow, skyBlurb, skyLabel } from "./snow.ts";
import { SKY_BLURB, SKY_LABELS } from "./weather.ts";

describe("winter snow", () => {
  it("names winter rain snow, and leaves every other sky and season alone", () => {
    expect(isSnow("rain", "winter")).toBe(true);
    expect(skyLabel("rain", "winter")).toBe("Snow");
    expect(skyBlurb("rain", "winter")).toContain("Snow");
    expect(isSnow("rain", "fall")).toBe(false);
    expect(isSnow("overcast", "winter")).toBe(false);
    expect(skyLabel("rain", null)).toBe(SKY_LABELS.rain);
    expect(skyBlurb("fog", "winter")).toBe(SKY_BLURB.fog);
  });
});
