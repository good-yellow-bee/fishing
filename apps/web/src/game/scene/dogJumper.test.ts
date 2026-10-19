import { describe, expect, it } from "vitest";
import { dogChestShape, dogRearShape } from "./DockDog";

function hasRed(shape: ReturnType<typeof dogRearShape>) {
  const color = shape.getAttribute("color");
  for (let i = 0; i < color.count; i += 1) if (color.getX(i) > 0.2 && color.getX(i) > 4 * color.getY(i)) return true;
  return false;
}

describe("dock dog's winter jumper", () => {
  it("dresses the back and the shoulders in red in winter only", () => {
    expect(hasRed(dogRearShape(true))).toBe(true);
    expect(hasRed(dogChestShape(true))).toBe(true);
    expect(hasRed(dogRearShape(false))).toBe(false);
    expect(dogRearShape(true).getAttribute("position").count).toBeGreaterThan(dogRearShape(false).getAttribute("position").count);
  });
});
