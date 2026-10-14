import { describe, expect, it } from "vitest";
import { FLOAT_COLOURS, floatU, recolourFloatUvs } from "./floatColour";

describe("float colour", () => {
  it("leaves the blue float as modelled", () => {
    expect(floatU(0.719, "blue")).toBeCloseTo(0.719);
  });

  it("slides the body swatch across the palette row and keeps the cap", () => {
    expect(Math.floor(floatU(0.719, "red") * 8)).toBe(4);
    expect(Math.floor(floatU(0.719, "yellow") * 8)).toBe(2);
    expect(Math.floor(floatU(0.719, "purple") * 8)).toBe(7);
    expect(floatU(0.594, "green")).toBeCloseTo(0.594);
  });

  it("keeps every colour inside the texture", () => {
    for (const colour of FLOAT_COLOURS) {
      const u = floatU(0.72, colour);
      expect(u).toBeGreaterThan(0);
      expect(u).toBeLessThan(1);
    }
  });

  it("repaints a uv array in place, u only", () => {
    const uv = [0.719, 0.525, 0.594, 0.775];
    recolourFloatUvs(uv, "green");
    expect(Math.floor(uv[0]! * 8)).toBe(1);
    expect(uv[1]).toBe(0.525);
    expect(uv[2]).toBe(0.594);
  });
});
