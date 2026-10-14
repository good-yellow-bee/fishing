import { describe, expect, it } from "vitest";
import { FISH } from "./fish.ts";

describe("species marks and lake lore", () => {
  it.each(FISH)("gives $name a silhouette and two short sentences", (fish) => {
    expect(fish.silhouette).toMatch(/^M\d/);
    expect(fish.lore.trim().length).toBeGreaterThan(0);
    expect(fish.lore.length).toBeLessThanOrEqual(160);
    expect(fish.lore.match(/[.!?](?:\s|$)/g)).toHaveLength(2);
  });

  it("gives every species a distinct silhouette", () => {
    expect(new Set(FISH.map((fish) => fish.silhouette)).size).toBe(FISH.length);
  });
});
