import { describe, expect, it } from "vitest";
import { swallowBody } from "./Swallows";

describe("swallowBody", () => {
  it("bakes body, belly and tail into one coloured shape", () => {
    const body = swallowBody();
    const position = body.getAttribute("position");
    const color = body.getAttribute("color");
    expect(color.count).toBe(position.count);
    const tones = new Set<string>();
    for (let i = 0; i < color.count; i += 1) tones.add(color.getX(i).toFixed(3));
    expect(tones.size).toBe(2);
    body.computeBoundingBox();
    expect(body.boundingBox!.min.z).toBeLessThan(-0.1);
  });
});
