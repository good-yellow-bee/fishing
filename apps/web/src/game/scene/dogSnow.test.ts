import { describe, expect, it } from "vitest";
import { DOG_SNOW_START, SHAKE_AT, SHAKE_SEC, dogShake, dogSnowShown, dogSnowStep, shakeFlake, type DogSnow } from "./dogSnow";

function run(seconds: number, falling: (t: number) => boolean, free: (t: number) => boolean = () => true, still = false, from: DogSnow = DOG_SNOW_START) {
  let state = from;
  const shakes: number[] = [];
  for (let t = 0; t < seconds; t += 1 / 30) {
    const next = dogSnowStep(state, t, 1 / 30, falling(t), free(t), still);
    if (next.shookAt !== state.shookAt) shakes.push(t);
    state = next;
  }
  return { state, shakes };
}

describe("snow on the dock dog", () => {
  it("builds while it falls, and the dog shakes it off now and then", () => {
    const { shakes, state } = run(200, () => true);
    expect(shakes.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < shakes.length; i++) expect(shakes[i]! - shakes[i - 1]!).toBeGreaterThan(15);
    expect(state.snow).toBeLessThan(SHAKE_AT);
  });

  it("melts away without a shake once the snow stops", () => {
    const { shakes, state } = run(60, (t) => t < 10);
    expect(shakes).toEqual([]);
    expect(state.snow).toBe(0);
  });

  it("waits to shake until it is lying down again, not sat up for a bite", () => {
    const { shakes } = run(60, () => true, (t) => t > 40);
    expect(shakes.length).toBeGreaterThan(0);
    expect(shakes[0]).toBeGreaterThan(40);
  });

  it("throws the layer off over a moment, then shakes hard and stops, flakes flying only while it shakes", () => {
    const shook: DogSnow = { snow: 0, shookAt: 10, thrown: 0.7 };
    expect(dogSnowShown(shook, 10)).toBeCloseTo(0.7);
    expect(dogSnowShown(shook, 10.1)).toBeGreaterThan(0.2);
    expect(dogSnowShown(shook, 10.3)).toBe(0);
    let peak = 0;
    for (let t = 10; t < 10 + SHAKE_SEC; t += 0.01) peak = Math.max(peak, Math.abs(dogShake(shook, t)));
    expect(peak).toBeGreaterThan(0.6);
    expect(dogShake(shook, 9.9)).toBe(0);
    expect(dogShake(shook, 10 + SHAKE_SEC + 0.01)).toBe(0);
    expect(shakeFlake(shook, 0, 10.3)).not.toBeNull();
    expect(shakeFlake(shook, 0, 10 + SHAKE_SEC + 0.01)).toBeNull();
  });

  it("keeps the same state object while nothing changes, and never shakes with reduced motion", () => {
    expect(dogSnowStep(DOG_SNOW_START, 5, 1 / 30, false, true)).toBe(DOG_SNOW_START);
    const { shakes, state } = run(120, () => true, () => true, true);
    expect(shakes).toEqual([]);
    expect(state.snow).toBe(1);
  });
});
