import { describe, expect, it } from "vitest";
import { firePitShape, flameShape } from "./Campfire";

describe("fire pit", () => {
  it("bakes the ring of stones and the sticks into one painted shape", () => {
    const pit = firePitShape();
    const colors = pit.getAttribute("color");
    expect(colors).toBeDefined();
    const tints = new Set(Array.from({ length: colors.count }, (_, i) => colors.getX(i).toFixed(3)));
    // Grey stones and dark sticks.
    expect(tints.size).toBe(2);
    pit.dispose();
  });

  it("bakes the flame's tongues into one shape", () => {
    const flame = flameShape();
    expect(flame.getAttribute("position").count).toBeGreaterThan(0);
    flame.dispose();
  });
});
