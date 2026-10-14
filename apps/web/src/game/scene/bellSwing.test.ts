import { describe, expect, it } from "vitest";
import { BITE_SWING, NIBBLE_SWING, bellShown, bellSwing } from "./bellSwing";

describe("rod bell swing", () => {
  it("hangs the bell only at night with a line in the water", () => {
    expect(bellShown(true, "waiting")).toBe(true);
    expect(bellShown(true, "hookset")).toBe(true);
    expect(bellShown(true, "idle")).toBe(false);
    expect(bellShown(false, "waiting")).toBe(false);
  });

  it("swings within its reach, harder on a bite, and settles", () => {
    let nibblePeak = 0;
    let bitePeak = 0;
    for (let s = 0; s < 1; s += 0.005) {
      nibblePeak = Math.max(nibblePeak, Math.abs(bellSwing(s, false)));
      bitePeak = Math.max(bitePeak, Math.abs(bellSwing(s, true)));
    }
    expect(nibblePeak).toBeLessThanOrEqual(NIBBLE_SWING);
    expect(bitePeak).toBeLessThanOrEqual(BITE_SWING);
    expect(bitePeak).toBeGreaterThan(nibblePeak);
    expect(Math.abs(bellSwing(2, true))).toBeLessThan(0.001);
    expect(bellSwing(-1, true)).toBe(0);
  });
});
