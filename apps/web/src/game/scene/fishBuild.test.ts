import { describe, expect, it } from "vitest";
import { FISH } from "@stillwater/shared";
import { PLAIN_BUILD, fishBuild } from "./fishBuild";

describe("fish builds", () => {
  it("give every species its own shape, within sane bounds", () => {
    for (const species of FISH) {
      const build = fishBuild(species.id);
      expect(build).not.toBe(PLAIN_BUILD);
      for (const key of ["length", "depth", "width", "snout", "dorsal"] as const) {
        expect(build[key]).toBeGreaterThan(0.5);
        expect(build[key]).toBeLessThan(1.8);
      }
    }
  });

  it("make pike long and lean, panfish deep, and catfish whiskered", () => {
    expect(fishBuild("pike").length / fishBuild("pike").depth).toBeGreaterThan(1.8);
    expect(fishBuild("bluegill").depth).toBeGreaterThan(fishBuild("bluegill").length);
    expect(fishBuild("catfish").barbels).toBe(4);
    expect(fishBuild("bluegill").barbels).toBe(0);
  });

  it("falls back to the plain fish for an unknown or missing species", () => {
    expect(fishBuild(undefined)).toBe(PLAIN_BUILD);
    expect(fishBuild("sea-serpent")).toBe(PLAIN_BUILD);
  });
});
