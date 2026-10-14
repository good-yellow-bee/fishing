import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { RAINBOW_BANDS, RAINBOW_PEAK, arcPoint, arcReflection, arcRows, rainbowCenter, rainbowOpacity, rainbowOut } from "./rainbowArc";

describe("rainbow", () => {
  it("stands only in rain with a low sun, outside winter and storms", () => {
    expect(rainbowOut("dawn", "rain", "summer", false)).toBe(true);
    expect(rainbowOut("dusk", "rain", "fall", false)).toBe(true);
    expect(rainbowOut("day", "rain", "summer", false)).toBe(false);
    expect(rainbowOut("night", "rain", "summer", false)).toBe(false);
    expect(rainbowOut("dawn", "clear", "summer", false)).toBe(false);
    expect(rainbowOut("dawn", "rain", "winter", false)).toBe(false);
    expect(rainbowOut("dawn", "rain", "summer", true)).toBe(false);
  });

  it("stands across the sky from the sun", () => {
    expect(rainbowCenter("dawn")[0]).toBeLessThan(0);
    expect(rainbowCenter("dusk")[0]).toBeGreaterThan(0);
  });

  it("brightens smoothly to its peak and stays there", () => {
    expect(rainbowOpacity(0)).toBe(0);
    expect(rainbowOpacity(4)).toBeGreaterThan(0);
    expect(rainbowOpacity(4)).toBeLessThan(RAINBOW_PEAK);
    expect(rainbowOpacity(60)).toBe(RAINBOW_PEAK);
  });

  it("runs red outside to violet inside, with soft clear rims", () => {
    const rows = arcRows();
    expect(rows).toHaveLength(RAINBOW_BANDS.length + 2);
    expect(rows[0]!.alpha).toBe(0);
    expect(rows.at(-1)!.alpha).toBe(0);
    expect(rows[1]!.color).toBe(RAINBOW_BANDS[0]);
    for (let i = 1; i < rows.length; i += 1) expect(rows[i]!.radius).toBeLessThan(rows[i - 1]!.radius);
  });

  it("mirrors the arc's top into the lake and drops what sits below the horizon", () => {
    const eye = { x: 0, y: 5, z: 6 };
    const top = arcPoint(rainbowCenter("dusk"), Math.PI / 2, 27);
    const at = arcReflection(top, eye);
    expect(at?.wet).toBe(true);
    expect(inLake(at!.x, at!.z)).toBe(true);
    expect(arcReflection(arcPoint(rainbowCenter("dusk"), 0, 27), eye)?.wet).toBe(false);
    expect(arcReflection(top, { x: 0, y: -1, z: 0 })).toBeNull();
  });
});
