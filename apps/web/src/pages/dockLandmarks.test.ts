import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dock = readFileSync(`${import.meta.dirname}/Dock.tsx`, "utf8");

describe("the lake page's side notes", () => {
  it("names each aside, so a screen reader's landmark list tells them apart", () => {
    const asides = dock.match(/<aside\b[^>]*>/g) ?? [];
    expect(asides.length).toBeGreaterThan(0);
    for (const aside of asides) expect(aside).toMatch(/aria-label|aria-labelledby|role="status"/);
  });
});
