import { describe, expect, it } from "vitest";
import { castHint, idleHint } from "./useFishingGame";

describe("idleHint", () => {
  it("speaks to fingers on touch screens and to the mouse elsewhere", () => {
    expect(idleHint("dock", true)).toBe("Touch the water in front of you and hold. Lift your finger in the green.");
    expect(idleHint("dock", false)).toBe("Point at the water in front of you, or use the arrow keys. Hold the mouse or Space, let go in the green.");
    expect(idleHint("shop", true)).not.toMatch(/\bE\b/);
    expect(idleHint("shop", false)).toMatch(/with E/);
    expect(idleHint(null, true)).toBe("Walk to the water.");
  });
});

describe("castHint", () => {
  it("never tells a finger to click or press Space", () => {
    for (const kind of ["landed", "cancelled", "overpowered", "ring"] as const) {
      expect(castHint(kind, true)).not.toMatch(/Click|Space|Release|Let go/);
      expect(castHint(kind, false)).toMatch(/Click|Let go/);
    }
  });

  it("names the green part of the Cast bar, not a moss band", () => {
    for (const touch of [true, false]) {
      for (const line of [idleHint("dock", touch), castHint("overpowered", touch), castHint("ring", touch)]) {
        expect(line).toMatch(/the green/);
        expect(line).not.toMatch(/moss|band/);
      }
    }
  });
});
