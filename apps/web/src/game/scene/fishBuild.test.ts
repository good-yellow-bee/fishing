import { describe, expect, it } from "vitest";
import { FISH } from "@stillwater/shared";
import { PLAIN_BUILD, bodySection, fishBuild, markPlacements } from "./fishBuild";

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

  it("marks perch with bars, trout with spots and pike with flecks, all on the body", () => {
    expect(fishBuild("perch").marks).toBe("bars");
    expect(fishBuild("rainbow-trout").marks).toBe("spots");
    expect(fishBuild("pike").marks).toBe("flecks");
    expect(markPlacements("none")).toEqual([]);
    for (const kind of ["bars", "spots", "flecks", "stripe"] as const) {
      const marks = markPlacements(kind);
      expect(marks.length).toBeGreaterThan(1);
      for (const mark of marks) {
        const [x, y, z] = mark.position;
        const at = bodySection(z);
        expect(at.x).toBeGreaterThan(0);
        // On or just at the skin, never floating off it.
        expect(Math.hypot(x / at.x, y / at.y)).toBeLessThanOrEqual(1.01);
      }
    }
  });
});

describe("fishBuild identity", () => {
  it("hands back the same build for a species every time", () => {
    expect(fishBuild("pike")).toBe(fishBuild("pike"));
    expect(fishBuild(undefined)).toBe(fishBuild("no-such-fish"));
  });
});
