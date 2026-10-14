import { describe, expect, it } from "vitest";
import { coverCrop, shareCardFileName } from "./shareCard";

describe("share card", () => {
  it("names the file by species and local day", () => {
    expect(shareCardFileName("tiger-muskie", new Date(2026, 9, 4, 23, 30))).toBe("stillwater-tiger-muskie-2026-10-04.png");
    expect(shareCardFileName("Odd Fish!", new Date(2026, 0, 1))).toBe("stillwater-odd-fish-2026-01-01.png");
    expect(shareCardFileName("???", new Date(2026, 0, 1))).toBe("stillwater-catch-2026-01-01.png");
  });

  it("crops a photo to fill the frame without stretching", () => {
    // A wide 640×400 snapshot into an 800×600 frame: full height, trimmed sides.
    const wide = coverCrop(640, 400, 800, 600);
    expect(wide.sh).toBeCloseTo(400);
    expect(wide.sw / wide.sh).toBeCloseTo(800 / 600);
    expect(wide.sx).toBeCloseTo((640 - wide.sw) / 2);
    expect(wide.sy).toBeCloseTo(0);
    // A tall one: full width, trimmed top and bottom.
    const tall = coverCrop(400, 640, 800, 600);
    expect(tall.sw).toBeCloseTo(400);
    expect(tall.sy).toBeGreaterThan(0);
  });
});
