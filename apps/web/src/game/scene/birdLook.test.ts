import { describe, expect, it } from "vitest";
import { BLACKBIRD, ROBIN, birdBodyShape, birdHeadShape } from "./DockRobin";

const colours = (geometry: { getAttribute: (name: string) => { array: ArrayLike<number> } }) => Array.from(geometry.getAttribute("color").array);

describe("bird looks", () => {
  it("paints the blackbird black where the robin is brown and orange, with a ring round its eye", () => {
    expect(colours(birdBodyShape(BLACKBIRD))).not.toEqual(colours(birdBodyShape(ROBIN)));
    const body = colours(birdBodyShape(BLACKBIRD));
    expect(Math.max(...body.filter((_, i) => i % 3 === 0))).toBeLessThan(0.1);
    expect(birdHeadShape(BLACKBIRD).getAttribute("position").count).toBeGreaterThan(birdHeadShape(ROBIN).getAttribute("position").count);
  });
});
