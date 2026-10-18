import { describe, expect, it } from "vitest";
import { spreadRows } from "./spreadRows";

describe("spreadRows", () => {
  it("keeps a short list whole", () => {
    expect(spreadRows([1, 2, 3], 10)).toEqual([1, 2, 3]);
  });

  it("picks evenly from first to last", () => {
    const rows = Array.from({ length: 100 }, (_, index) => index);
    const picked = spreadRows(rows, 10);
    expect(picked).toHaveLength(10);
    expect(picked[0]).toBe(0);
    expect(picked[9]).toBe(99);
    expect(new Set(picked).size).toBe(10);
    expect([...picked].sort((a, b) => a - b)).toEqual(picked);
  });

  it("never picks a row twice when just over the count", () => {
    const rows = Array.from({ length: 11 }, (_, index) => index);
    expect(new Set(spreadRows(rows, 10)).size).toBe(10);
  });
});
