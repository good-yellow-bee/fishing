import { describe, expect, it } from "vitest";
import { CRAYFISH_REACH, onCrayfishBed } from "./crayfishJig";
import { CRAYFISH_HOMES } from "./scene/crayfishCrawl";

describe("onCrayfishBed", () => {
  const home = CRAYFISH_HOMES[0]!;

  it("lands on the crayfish bed round the dock's pilings from spring to fall", () => {
    for (const season of ["spring", "summer", "fall"] as const) expect(onCrayfishBed(season, home.x, home.z)).toBe(true);
    expect(onCrayfishBed("summer", home.x, home.z + CRAYFISH_REACH * 0.9)).toBe(true);
    expect(onCrayfishBed("summer", home.x, home.z - 3)).toBe(false);
  });

  it("finds no crayfish about in winter, or without a season", () => {
    expect(onCrayfishBed("winter", home.x, home.z)).toBe(false);
    expect(onCrayfishBed(undefined, home.x, home.z)).toBe(false);
  });
});
