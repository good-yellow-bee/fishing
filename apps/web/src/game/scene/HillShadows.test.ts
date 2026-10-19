import { describe, expect, it } from "vitest";
import { hillFront } from "./farHills";
import { hillVeilShape } from "./HillShadows";

describe("hill cloud shadows", () => {
  it("lie just in front of the hills' face, inside their outline, mapped by x and height", () => {
    const veil = hillVeilShape();
    const position = veil.getAttribute("position");
    const uv = veil.getAttribute("uv");
    expect(position.count).toBeGreaterThan(1000);
    for (let i = 0; i < position.count; i += 7) {
      const [x, y, z] = [position.getX(i), position.getY(i), position.getZ(i)];
      const face = hillFront(x, y);
      expect(face).not.toBeNull();
      expect(z).toBeGreaterThan(face!);
      expect(z).toBeLessThan(face! + 0.15);
      // One scale both ways, so the clouds keep their shape on the hills.
      expect(uv.getX(i) * y).toBeCloseTo(uv.getY(i) * x, 4);
    }
    veil.dispose();
  });
});
