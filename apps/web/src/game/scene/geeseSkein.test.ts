import { describe, expect, it } from "vitest";
import { CROSS_SEC, SKEIN_REST, SKEIN_SIZE, SKEIN_SPAN_X, geeseOut, skeinBird, skeinReady } from "./geeseSkein";

describe("geese skein", () => {
  it("crosses on fall days and evenings when it isn't raining", () => {
    expect(geeseOut("day", "clear", "fall")).toBe(true);
    expect(geeseOut("dusk", "overcast", "fall")).toBe(true);
    expect(geeseOut("night", "clear", "fall")).toBe(false);
    expect(geeseOut("day", "rain", "fall")).toBe(false);
    expect(geeseOut("day", "clear", "summer")).toBe(false);
  });

  it("flies a V behind its leader, from one side to the other", () => {
    const leader = skeinBird(0, CROSS_SEC / 2, 1)!;
    for (let k = 1; k < SKEIN_SIZE; k += 1) {
      const bird = skeinBird(k, CROSS_SEC / 2, 1)!;
      expect(bird.x).toBeLessThan(leader.x);
    }
    expect(Math.sign(skeinBird(1, 5, 1)!.z - leader.z)).not.toBe(Math.sign(skeinBird(2, 5, 1)!.z - leader.z));
    expect(skeinBird(0, 0, 1)!.x).toBeCloseTo(-SKEIN_SPAN_X);
    expect(skeinBird(0, CROSS_SEC, -1)!.x).toBeCloseTo(-SKEIN_SPAN_X);
    expect(skeinBird(0, -1, 1)).toBeNull();
    expect(skeinBird(0, CROSS_SEC + 1, 1)).toBeNull();
  });

  it("stays inside the sky dome", () => {
    for (let k = 0; k < SKEIN_SIZE; k += 1) {
      for (let age = 0; age <= CROSS_SEC; age += 1) {
        const bird = skeinBird(k, age, 1)!;
        expect(Math.hypot(bird.x, bird.y, bird.z)).toBeLessThan(90);
      }
    }
  });

  it("rests between skeins", () => {
    expect(skeinReady(10, 0)).toBe(false);
    expect(skeinReady(CROSS_SEC + SKEIN_REST, 0)).toBe(true);
  });
});
