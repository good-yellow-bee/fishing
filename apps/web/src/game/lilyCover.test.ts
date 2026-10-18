import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { LILY_COVER_REACH, LILY_COVER_WAIT, LILY_PADS_AT, tightToPads } from "./lilyCover";

describe("tight to the lily pads", () => {
  it("counts a cast landing within reach of a pad, from spring to fall", () => {
    expect(LILY_COVER_WAIT).toBeLessThan(1);
    for (const pad of LILY_PADS_AT) {
      expect(inLake(pad.x, pad.z)).toBe(true);
      expect(tightToPads("summer", pad.x + LILY_COVER_REACH * 0.9, pad.z)).toBe(true);
    }
    expect(tightToPads("spring", -8.4, 5.5)).toBe(true);
    expect(tightToPads("fall", -8.4, 5.5)).toBe(true);
    expect(tightToPads("summer", 0, -2)).toBe(false);
  });

  it("finds no pads in winter or without a season", () => {
    expect(tightToPads("winter", -8.4, 5.5)).toBe(false);
    expect(tightToPads(undefined, -8.4, 5.5)).toBe(false);
  });
});
