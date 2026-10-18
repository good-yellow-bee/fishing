import { describe, expect, it } from "vitest";
import { castHint, idleHint } from "./useFishingGame";

describe("idleHint", () => {
  it("speaks to fingers on touch screens and to the mouse elsewhere", () => {
    expect(idleHint("dock", true)).toBe("Touch the water to aim. Hold to charge, lift in the moss band.");
    expect(idleHint("dock", false)).toBe("Click the water or use the arrow keys to aim. Hold to charge, release in the moss band.");
    expect(idleHint("shop", true)).not.toMatch(/\bE\b/);
    expect(idleHint("shop", false)).toMatch(/with E/);
    expect(idleHint(null, true)).toBe("Walk to the water.");
  });
});

describe("castHint", () => {
  it("never tells a finger to click or press Space", () => {
    for (const kind of ["landed", "cancelled", "overpowered", "ring"] as const) {
      expect(castHint(kind, true)).not.toMatch(/Click|Space|Release/);
      expect(castHint(kind, false)).toMatch(/Click|Release/);
    }
  });
});
