import { describe, expect, it } from "vitest";
import { easeLily, lilyBloom, lilyCup, lilyOpen, lilyPads, PETAL_COUNT, petalAngles } from "./lilyBloom";

describe("lilyBloom", () => {
  it("flowers in summer, buds in spring, and rests in fall and winter", () => {
    expect(lilyBloom("summer")).toBe("flower");
    expect(lilyBloom("spring")).toBe("bud");
    expect(lilyBloom("fall")).toBeNull();
    expect(lilyBloom("winter")).toBeNull();
  });

  it("grows its pads small in spring and full in summer and fall, and lets them die back in winter", () => {
    expect(lilyPads("spring")!.grow).toBeLessThan(1);
    expect(lilyPads("summer")!.grow).toBe(1);
    expect(lilyPads("fall")!.grow).toBe(1);
    expect(lilyPads("winter")).toBeNull();
  });

  it("spaces the petals evenly round the flower", () => {
    const angles = petalAngles();
    expect(angles).toHaveLength(PETAL_COUNT);
    expect(angles[1]! - angles[0]!).toBeCloseTo((Math.PI * 2) / PETAL_COUNT);
  });

  it("open wide by day, half at dawn, close toward dusk and shut at night", () => {
    expect(lilyOpen("day", "clear")).toBe(1);
    expect(lilyOpen("dawn", "clear")).toBeLessThan(1);
    expect(lilyOpen("dusk", "clear")).toBeLessThan(lilyOpen("dawn", "clear"));
    expect(lilyOpen("night", "clear")).toBe(0);
  });

  it("stay partly closed in dull weather and nearly shut in rain", () => {
    expect(lilyOpen("day", "overcast")).toBeLessThan(1);
    expect(lilyOpen("day", "rain")).toBeLessThan(lilyOpen("day", "overcast"));
    expect(lilyOpen("day", "rain")).toBeGreaterThan(0);
  });

  it("draw their petals in and up into a cup as they close", () => {
    expect(lilyCup(1)).toEqual({ spread: 1, rise: 1 });
    const shut = lilyCup(0);
    expect(shut.spread).toBeLessThan(0.5);
    expect(shut.rise).toBeGreaterThan(2);
    expect(lilyCup(0.5).spread).toBeGreaterThan(shut.spread);
    expect(lilyCup(0.5).spread).toBeLessThan(1);
  });

  it("open and close slowly rather than snapping", () => {
    const step = easeLily(0, 1, 1 / 60);
    expect(step).toBeGreaterThan(0);
    expect(step).toBeLessThan(0.02);
    let open = 0;
    for (let f = 0; f < 60 * 20; f += 1) open = easeLily(open, 1, 1 / 60);
    expect(open).toBeGreaterThan(0.99);
  });
});
