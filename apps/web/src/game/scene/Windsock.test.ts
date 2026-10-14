import { describe, expect, it } from "vitest";
import { sockShape } from "./Windsock";

describe("sockShape", () => {
  it("bakes three stripes in two colours along +z from the hoop", () => {
    const sock = sockShape();
    sock.computeBoundingBox();
    expect(sock.boundingBox!.min.z).toBeCloseTo(0, 5);
    expect(sock.boundingBox!.max.z).toBeCloseTo(0.62, 5);
    const color = sock.getAttribute("color");
    const tones = new Set<string>();
    for (let i = 0; i < color.count; i += 1) tones.add(`${color.getX(i).toFixed(3)},${color.getY(i).toFixed(3)}`);
    expect(tones.size).toBe(2);
  });
});
