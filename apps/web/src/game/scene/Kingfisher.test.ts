import { describe, expect, it } from "vitest";
import { kingfisherShapes } from "./Kingfisher";
import { KINGFISHER_PERCH } from "./kingfisherFlight";

describe("kingfisherShapes", () => {
  it("bakes the bird in its three colours and the snag up to the perch", () => {
    const { bird, snag } = kingfisherShapes();
    const color = bird.getAttribute("color");
    const tones = new Set<string>();
    for (let i = 0; i < color.count; i += 1) tones.add(`${color.getX(i).toFixed(3)},${color.getZ(i).toFixed(3)}`);
    expect(tones.size).toBe(3);
    snag.computeBoundingBox();
    expect(snag.boundingBox!.max.y).toBeGreaterThan(KINGFISHER_PERCH.y - 0.05);
  });
});
