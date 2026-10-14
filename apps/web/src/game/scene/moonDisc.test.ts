import { describe, expect, it } from "vitest";
import { moonAlpha } from "./moonDisc";

const size = 32;
const at = (alpha: Float32Array, col: number, row: number) => alpha[row * size + col]!;
const mid = size / 2;

describe("the night moon's face", () => {
  it("is fully lit at full moon and only faint at new moon, clear outside the disc", () => {
    const full = moonAlpha(0.5, size);
    const fresh = moonAlpha(0, size);
    expect(at(full, mid, mid)).toBe(1);
    expect(at(fresh, mid, mid)).toBeLessThan(0.2);
    expect(at(full, 0, 0)).toBe(0);
  });

  it("lights the right half at first quarter and the left half at last quarter", () => {
    const first = moonAlpha(0.25, size);
    const last = moonAlpha(0.75, size);
    expect(at(first, size - 4, mid)).toBe(1);
    expect(at(first, 3, mid)).toBeLessThan(0.2);
    expect(at(last, 3, mid)).toBe(1);
    expect(at(last, size - 4, mid)).toBeLessThan(0.2);
  });
});
