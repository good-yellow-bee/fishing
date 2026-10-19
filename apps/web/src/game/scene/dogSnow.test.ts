import { describe, expect, it } from "vitest";
import { DOG_SNOW_START, SHAKE_AT, SHAKE_SEC, dogShake, dogSnowStep, shakeFlake, type DogSnow } from "./dogSnow";

function run(seconds: number, falling: (t: number) => boolean, still = false, from: DogSnow = DOG_SNOW_START) {
  let state = from;
  const shakes: number[] = [];
  for (let t = 0; t < seconds; t += 1 / 30) {
    const next = dogSnowStep(state, t, 1 / 30, falling(t), still);
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

  it("shakes hard at first and stops, with flakes flying only while it shakes", () => {
    const shook: DogSnow = { snow: 0, shookAt: 10 };
    let peak = 0;
    for (let t = 10; t < 10 + SHAKE_SEC; t += 0.01) peak = Math.max(peak, Math.abs(dogShake(shook, t)));
    expect(peak).toBeGreaterThan(0.6);
    expect(dogShake(shook, 9.9)).toBe(0);
    expect(dogShake(shook, 10 + SHAKE_SEC + 0.01)).toBe(0);
    expect(shakeFlake(shook, 0, 10.3)).not.toBeNull();
    expect(shakeFlake(shook, 0, 10 + SHAKE_SEC + 0.01)).toBeNull();
    expect(Math.abs(dogShake(shook, 10 + SHAKE_SEC - 0.01))).toBeLessThan(0.05);
  });

  it("never shakes with reduced motion; the snow just lies there", () => {
    const { shakes, state } = run(120, () => true, true);
    expect(shakes).toEqual([]);
    expect(state.snow).toBe(1);
  });
});
