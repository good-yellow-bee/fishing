import { describe, expect, it } from "vitest";
import { gearOpacity, LEADER_LEN, leaderGlint, leaderTail } from "./lineGear";

function length(points: Float32Array, n: number) {
  let total = 0;
  for (let i = 1; i < n; i += 1) total += Math.hypot(points[i * 3] - points[i * 3 - 3], points[i * 3 + 1] - points[i * 3 - 2], points[i * 3 + 2] - points[i * 3 - 1]);
  return total;
}

describe("gearOpacity", () => {
  it("keeps the standard line and the wire leader's line as they were, in any water", () => {
    for (const [bright, winter] of [[false, false], [true, false], [false, true], [true, true]]) {
      expect(gearOpacity(0.55, "standard", bright, winter)).toBe(0.55);
      expect(gearOpacity(0.55, "wire", bright, winter)).toBe(0.55);
    }
  });

  it("shows light line fainter and heavy line plainer, under a hard run's pull", () => {
    expect(gearOpacity(0.55, "light", false, false)).toBeLessThan(0.55);
    expect(gearOpacity(0.55, "heavy", false, false)).toBeGreaterThan(0.7);
    expect(gearOpacity(0.72, "heavy", false, false)).toBeLessThan(0.9);
  });

  it("shows heavy line plainer still in bright, calm water or winter's clear water", () => {
    const plain = gearOpacity(0.55, "heavy", false, false);
    expect(gearOpacity(0.55, "heavy", true, false)).toBeGreaterThan(plain + 0.08);
    expect(gearOpacity(0.55, "heavy", false, true)).toBeGreaterThan(plain + 0.08);
    expect(gearOpacity(0.72, "heavy", true, true)).toBeLessThan(0.9);
  });

  it("all but loses light line in winter's clear water, not on a bright, calm day", () => {
    const faint = gearOpacity(0.55, "light", false, false);
    expect(gearOpacity(0.55, "light", false, true)).toBeLessThan(faint * 0.7);
    expect(gearOpacity(0.55, "light", true, false)).toBe(faint);
  });
});

describe("leaderTail", () => {
  // A line out from the rod tip in 1 m steps, dropping to the water.
  const line = new Float32Array([0, 2, 0, 0, 1.5, 1, 0, 1, 2, 0, 0.5, 3, 0, 0.1, 4]);

  it("takes the last meter of the line, ending at the lure", () => {
    const out = new Float32Array(16 * 3);
    const n = leaderTail(line, 5, LEADER_LEN, out);
    expect(n).toBe(2);
    expect(length(out, n)).toBeCloseTo(LEADER_LEN, 5);
    expect([...out.slice((n - 1) * 3, n * 3)]).toEqual([0, expect.closeTo(0.1, 5), 4]);
  });

  it("runs back over several short segments", () => {
    const out = new Float32Array(16 * 3);
    const n = leaderTail(line, 5, 2.5, out);
    expect(n).toBe(4);
    expect(length(out, n)).toBeCloseTo(2.5, 5);
  });

  it("takes the whole line when it is shorter than the trace", () => {
    const out = new Float32Array(16 * 3);
    expect(leaderTail(line, 5, 50, out)).toBe(5);
    expect(leaderTail(line, 1, 0.5, out)).toBe(0);
  });

  it("keeps the lure end when the buffer is short", () => {
    const out = new Float32Array(3 * 3);
    const n = leaderTail(line, 5, 50, out);
    expect(n).toBe(3);
    expect([...out.slice(6, 9)]).toEqual([0, expect.closeTo(0.1, 5), 4]);
  });
});

describe("leaderGlint", () => {
  it("flashes briefly every few seconds and is dark between", () => {
    const samples = Array.from({ length: 260 }, (_, i) => leaderGlint(i / 100));
    expect(Math.max(...samples)).toBeGreaterThan(0.95);
    expect(samples.filter((v) => v > 0).length).toBeLessThan(40);
  });
});
