import { describe, expect, it } from "vitest";
import { swanShapes } from "./Swans";

describe("swanShapes", () => {
  it("bakes the neck, head, beak and knob into one shape in three colours", () => {
    const { body, neck } = swanShapes();
    const color = neck.getAttribute("color");
    expect(color.count).toBe(neck.getAttribute("position").count);
    const tones = new Set<string>();
    for (let i = 0; i < color.count; i += 1) tones.add(`${color.getX(i).toFixed(3)},${color.getY(i).toFixed(3)}`);
    expect(tones.size).toBe(3);
    body.computeBoundingBox();
    // The tail reaches back past the body.
    expect(body.boundingBox!.min.z).toBeLessThan(-0.5);
  });
});
